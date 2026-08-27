import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Errors } from '../../lib/errors.js';
import type { AiGenerationProvider } from '../../providers/ai/AiGenerationProvider.js';
import { completeGenerationJob, createGenerationJob, failGenerationJob, getGenerationJob } from './repository.js';

const questForgeSchema = z.object({
  ideaText: z.string().min(3).max(2000),
  constraints: z.record(z.unknown()).optional(),
});

/**
 * Section 14.1 (Quest Forge) + Section 38 (job ID / resumable status for
 * long AI tasks). The actual generation call runs inline rather than on a
 * BullMQ worker (ADR-004 reserves that for when job volume/timeout needs
 * justify the extra infra) — the job record and polling contract are real,
 * the execution model is a documented Gate 4 simplification.
 */
export function generationRoutes(pool: Pool, aiProvider: AiGenerationProvider): Router {
  const router = Router();

  router.post('/quest-forge', async (req, res, next) => {
    try {
      if (!req.session.userId && !req.session.isGuest) {
        next(Errors.unauthorized('Start a session (login or guest) before generating a quest.'));
        return;
      }
      if (req.session.isGuest) {
        const count = req.session.guestGenerationCount ?? 0;
        if (count >= 1) {
          next(
            Errors.forbidden('generate another AI quest as a guest', 'account')
          );
          return;
        }
        req.session.guestGenerationCount = count + 1;
      }

      const input = questForgeSchema.parse(req.body);
      const jobId = await createGenerationJob(pool, 'quest_forge', req.session.userId ?? null, input);

      try {
        const output = await aiProvider.generateQuestDraft(input);
        await completeGenerationJob(pool, jobId, output);
      } catch (genErr) {
        await failGenerationJob(pool, jobId, genErr instanceof Error ? genErr.message : 'Unknown generation error');
      }

      res.status(202).json({ jobId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.get('/jobs/:id', async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const job = await getGenerationJob(pool, id);
      if (!job) {
        next(Errors.notFound('Generation job'));
        return;
      }
      res.json({ job });
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
