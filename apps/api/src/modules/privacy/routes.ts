import { Router } from 'express';
import type { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';
import { eraseUser, exportUserData } from './repository.js';

export function privacyRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/export', requireAuth(), async (req, res, next) => {
    try {
      const data = await exportUserData(pool, req.session.userId as string);
      res.setHeader('Content-Disposition', 'attachment; filename="quest-board-export.json"');
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  router.post('/erase', requireAuth(), async (req, res, next) => {
    try {
      const userId = req.session.userId as string;
      await eraseUser(pool, userId);
      req.session.destroy(() => {
        res.status(204).end();
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
