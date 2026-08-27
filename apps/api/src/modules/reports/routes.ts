import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Errors } from '../../lib/errors.js';
import { createReport } from './repository.js';

const reportSchema = z.object({
  targetType: z.enum(['quest_version', 'user', 'review']).default('quest_version'),
  targetId: z.string().uuid(),
  category: z.enum([
    'closure', 'inaccessibility', 'unsafe_conditions', 'bad_directions', 'trespass_risk',
    'injury_emergency', 'harassment', 'fraudulent_rewards', 'inappropriate_child_content',
    'incorrect_restrictions',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  note: z.string().max(2000).nullable().default(null),
});

/**
 * Section 25: reporting paths for closures, unsafe conditions, harassment,
 * etc. Deliberately not gated behind `requireAuth()` — a guest witnessing
 * an unsafe condition should be able to report it without creating an
 * account first, the same reasoning QB-001 applies to guest AI generation.
 */
export function reportsRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const input = reportSchema.parse(req.body);
      const result = await createReport(pool, {
        reporterUserId: req.session.userId ?? null,
        targetType: input.targetType,
        targetId: input.targetId,
        category: input.category,
        severity: input.severity,
        note: input.note,
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  return router;
}
