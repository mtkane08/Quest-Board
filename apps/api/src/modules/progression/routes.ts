import { Router } from 'express';
import type { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';
import { calculateLevel } from './leveling.js';
import { calculateCurrentStreak } from './streak.js';

export function progressionRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/me', requireAuth(), async (req, res, next) => {
    try {
      const userId = req.session.userId as string;

      const xpResult = await pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE user_id = $1`,
        [userId],
      );
      const totalXp = Number(xpResult.rows[0]?.total ?? 0);

      const completionDatesResult = await pool.query<{ completed_at: string }>(
        `SELECT completed_at FROM quest_attempts WHERE user_id = $1 AND state IN ('completed', 'partially_completed') AND completed_at IS NOT NULL`,
        [userId],
      );
      const streak = calculateCurrentStreak(
        completionDatesResult.rows.map((r) => new Date(r.completed_at).toISOString()),
        new Date().toISOString(),
      );

      const badgesResult = await pool.query<{ badge_key: string; earned_at: string }>(
        `SELECT badge_key, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at`,
        [userId],
      );

      res.json({
        totalXp,
        ...calculateLevel(totalXp),
        currentStreakDays: streak,
        badges: badgesResult.rows,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
