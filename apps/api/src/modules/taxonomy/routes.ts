import { Router } from 'express';
import type { Pool } from 'pg';

/**
 * Public, read-only taxonomy endpoints (docs/gate-1/04-api-contracts.md).
 * Admin write endpoints (edit taxonomy without a deploy, QB-020) are added
 * once the admin console ships (Gate 6) — this Foundation slice proves the
 * data is DB-backed and seedable, which is the prerequisite for that UI.
 */
export function taxonomyRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/realms', async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT stable_key, display_name FROM taxonomy_nodes WHERE kind = 'realm' AND is_active ORDER BY sort_order, display_name`,
      );
      res.json({ realms: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/guilds', async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT stable_key, display_name, plain_subtitle, safety_metadata
         FROM taxonomy_nodes WHERE kind = 'guild' AND is_active
         ORDER BY sort_order, display_name`,
      );
      res.json({ guilds: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/tags', async (_req, res, next) => {
    try {
      const result = await pool.query('SELECT key, label, category FROM tags ORDER BY category, key');
      res.json({ tags: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/tones', async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT key, label FROM tones WHERE moderation_state = 'approved' ORDER BY label`,
      );
      res.json({ tones: result.rows });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
