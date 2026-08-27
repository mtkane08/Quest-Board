import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';
import { deleteExplorationHistory, getRegionProgress, getSessionOwnership, recordPing, startSession, stopSession } from './repository.js';

const pingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  travelMode: z.enum(['walk', 'cycle', 'drive']),
});

/**
 * Section 20: fog of war is opt-in and foreground-only for Release 1.1 —
 * a session must be explicitly started, and there is no background
 * tracking anywhere in this module (Section 20/29: "background tracking
 * requires separate permission," which this build does not implement).
 */
export function explorationRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/sessions/start', requireAuth(), async (req, res, next) => {
    try {
      const sessionId = await startSession(pool, req.session.userId as string);
      res.status(201).json({ sessionId });
    } catch (err) {
      next(err);
    }
  });

  router.post('/sessions/:id/ping', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getSessionOwnership(pool, id);
      if (!ownership || ownership.userId !== req.session.userId) {
        next(Errors.notFound('Exploration session'));
        return;
      }
      if (ownership.endedAt) {
        next(Errors.conflict('This exploration session has already ended.'));
        return;
      }
      const { lat, lng, travelMode } = pingSchema.parse(req.body);
      const result = await recordPing(pool, id, req.session.userId as string, lat, lng, travelMode);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/sessions/:id/stop', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getSessionOwnership(pool, id);
      if (!ownership || ownership.userId !== req.session.userId) {
        next(Errors.notFound('Exploration session'));
        return;
      }
      await stopSession(pool, id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.get('/regions', requireAuth(), async (req, res, next) => {
    try {
      const progress = await getRegionProgress(pool, req.session.userId as string);
      res.json(progress);
    } catch (err) {
      next(err);
    }
  });

  // QB-121: deletes fog/location history without touching badges, XP, or
  // any other achievement data — see deleteExplorationHistory's scope.
  router.delete('/history', requireAuth(), async (req, res, next) => {
    try {
      await deleteExplorationHistory(pool, req.session.userId as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
