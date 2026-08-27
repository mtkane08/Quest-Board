import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';
import { decideAppeal, decideModerationCase } from './repository.js';

const decideSchema = z.object({
  decision: z.enum(['approve', 'request_changes', 'suspend']),
  reasonCode: z.string().max(100).optional(),
});

const appealDecisionSchema = z.object({
  decision: z.enum(['uphold', 'deny']),
});

function mapRepositoryError(err: unknown, next: (e: unknown) => void): boolean {
  if (!(err instanceof Error) || !('code' in err)) return false;
  const code = (err as { code?: string }).code;
  if (code === 'NOT_FOUND') {
    next(Errors.notFound('Resource'));
    return true;
  }
  if (code === 'CONFLICT') {
    next(Errors.conflict(err.message));
    return true;
  }
  if (code === 'VALIDATION') {
    next(Errors.validation(err.message));
    return true;
  }
  return false;
}

/**
 * Section 24's moderation-decision loop, extended in Gate 6 to also cover
 * Section 25's flagged/suspended path, plus appeals (Section 24: "support
 * appeals"). Still not the full admin console/queue UI — see
 * apps/api/src/modules/admin/routes.ts for the read-only queue/audit
 * surfaces this pairs with.
 */
export function moderationRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/cases/:id/decide', requirePermission(pool, 'decide', 'moderation-case', 'any'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const { decision, reasonCode } = decideSchema.parse(req.body);
      const result = await decideModerationCase(pool, id, decision, req.session.userId as string, reasonCode);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      if (mapRepositoryError(err, next)) return;
      next(err);
    }
  });

  router.post('/appeals/:id/decide', requirePermission(pool, 'decide', 'moderation-case', 'any'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const { decision } = appealDecisionSchema.parse(req.body);
      await decideAppeal(pool, id, decision, req.session.userId as string);
      res.status(200).json({ decision });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      if (mapRepositoryError(err, next)) return;
      next(err);
    }
  });

  return router;
}
