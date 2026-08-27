import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { idempotent } from '../../middleware/idempotency.js';
import { Errors } from '../../lib/errors.js';
import { calculateReward } from '../progression/reward.js';
import { evaluateNewBadges } from '../progression/badges.js';
import { submitRating } from '../ratings/repository.js';
import { revealTilesForQuestCompletion } from '../exploration/repository.js';
import {
  awardBadges,
  createAttempt,
  finalizeAttemptCompletion,
  getAttemptObjectives,
  getAttemptOwnership,
  getPriorCompletionCount,
  getUserCompletionCount,
  recordEvidence,
  setAttemptState,
} from './repository.js';

const evidenceSchema = z.object({
  objectiveId: z.string().uuid().nullable().default(null),
  type: z.enum(['honor_system', 'gps', 'photo', 'video', 'answer', 'host_approval', 'party_confirmation', 'external']),
  note: z.string().max(1000).nullable().default(null),
});

const ratingSchema = z.object({
  enjoyment: z.number().int().min(1).max(5),
  accuracy: z.number().int().min(1).max(5),
  tierAccuracy: z.number().int().min(1).max(5),
  wouldRecommend: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).nullable().default(null),
});

function requireOwnAttempt(ownership: { userId: string } | null, userId: string | undefined) {
  return ownership !== null && ownership.userId === userId;
}

/**
 * Section 18 (completion/evidence) + Section 19 (progression). Attempts
 * require an account (Section 6) — see docs/gate-5/00-attempts-report.md
 * "known limitations" for why guest attempts are out of scope this gate.
 */
export function attemptsRoutes(pool: Pool): Router {
  const router = Router();

  router.post('/', requireAuth(), async (req, res, next) => {
    try {
      const { questId } = z.object({ questId: z.string().uuid() }).parse(req.body);
      const attemptId = await createAttempt(pool, req.session.userId as string, questId);
      res.status(201).json({ attemptId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      if (err instanceof Error && (err as { code?: string }).code === 'NOT_FOUND') {
        next(Errors.notFound('Quest'));
        return;
      }
      if (err instanceof Error && (err as { code?: string }).code === 'CONFLICT') {
        next(Errors.conflict(err.message));
        return;
      }
      next(err);
    }
  });

  router.get('/mine', requireAuth(), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT qa.id AS attempt_id, qa.state, qa.started_at, qa.completed_at, qv.title
         FROM quest_attempts qa JOIN quest_versions qv ON qv.id = qa.quest_version_id
         WHERE qa.user_id = $1 ORDER BY qa.created_at DESC`,
        [req.session.userId],
      );
      res.json({ attempts: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      const objectives = await getAttemptObjectives(pool, id);
      res.json({ attempt: ownership, objectives });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/:id/pause', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'active') {
        next(Errors.conflict(`Attempt is "${ownership!.state}" — only an active attempt can be paused.`));
        return;
      }
      await setAttemptState(pool, id, 'paused', { paused_at: new Date() });
      res.json({ state: 'paused' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/:id/resume', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'paused') {
        next(Errors.conflict(`Attempt is "${ownership!.state}" — only a paused attempt can be resumed.`));
        return;
      }
      await setAttemptState(pool, id, 'active');
      res.json({ state: 'active' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  // Section 18: "Users may pause, resume, abandon without harsh penalty" —
  // abandoning simply forfeits this attempt's reward; it does not touch
  // XP already earned from other attempts, and a fresh attempt can always
  // be started afterward.
  router.post('/:id/abandon', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'active' && ownership!.state !== 'paused') {
        next(Errors.conflict(`Attempt is "${ownership!.state}" and cannot be abandoned from there.`));
        return;
      }
      await setAttemptState(pool, id, 'abandoned');
      res.json({ state: 'abandoned' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/:id/evidence', requireAuth(), idempotent(pool, 'attempts.evidence'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'active') {
        next(Errors.conflict(`Attempt is "${ownership!.state}" — evidence can only be added to an active attempt.`));
        return;
      }
      const { objectiveId, type, note } = evidenceSchema.parse(req.body);
      if (objectiveId) {
        const objectives = await getAttemptObjectives(pool, id);
        if (!objectives.some((o) => o.id === objectiveId)) {
          next(Errors.validation('objectiveId does not belong to this attempt.'));
          return;
        }
      }
      await recordEvidence(pool, id, objectiveId, type, note);
      res.status(201).json({ recorded: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  // Section 18: proportional evidence, partial XP for partial completion.
  // A single endpoint auto-detects full vs. partial based on how many
  // objectives actually have evidence recorded, rather than trusting the
  // client to declare which outcome it wants.
  router.post('/:id/complete', requireAuth(), idempotent(pool, 'attempts.complete'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'active') {
        next(Errors.conflict(`Attempt is "${ownership!.state}" — only an active attempt can be completed.`));
        return;
      }

      const objectives = await getAttemptObjectives(pool, id);
      const completedCount = objectives.filter((o) => o.completedAt !== null).length;
      const fraction = objectives.length === 0 ? 1 : completedCount / objectives.length;
      const outcome: 'completed' | 'partially_completed' = fraction >= 1 ? 'completed' : 'partially_completed';

      const tierResult = await pool.query<{ overall_tier: string; lat: number | null; lng: number | null }>(
        `SELECT overall_tier, ST_Y(primary_location::geometry) AS lat, ST_X(primary_location::geometry) AS lng
         FROM quest_versions WHERE id = $1`,
        [ownership!.questVersionId],
      );
      const tier = tierResult.rows[0]?.overall_tier as Parameters<typeof calculateReward>[0]['tier'] | undefined;
      if (!tier) throw new Error('Quest version has no tier — cannot calculate reward.');

      const priorCompletions = await getPriorCompletionCount(pool, req.session.userId as string, ownership!.questId, id);
      const reward = calculateReward({ tier, objectivesCompletedFraction: fraction, priorCompletionCount: priorCompletions });

      const previousBadgeCount = await getUserCompletionCount(pool, req.session.userId as string);
      await finalizeAttemptCompletion(pool, id, req.session.userId as string, ownership!.questId, outcome, reward.xp, reward.version);

      if (outcome === 'completed') {
        const newBadgeCount = previousBadgeCount + 1;
        const newBadges = evaluateNewBadges(previousBadgeCount, newBadgeCount);
        if (newBadges.length > 0) {
          await awardBadges(pool, req.session.userId as string, newBadges.map((b) => b.key));
        }
        // Section 20: "Completing a quest reveals a larger nearby area" —
        // only for location-based quests; an at-home Hearth quest has no
        // coordinates to reveal anything around.
        const { lat, lng } = tierResult.rows[0]!;
        if (lat != null && lng != null) {
          await revealTilesForQuestCompletion(pool, req.session.userId as string, lat, lng);
        }
        res.json({ state: outcome, xpAwarded: reward.xp, objectivesCompletedFraction: fraction, newBadges: newBadges.map((b) => b.key) });
        return;
      }

      res.json({ state: outcome, xpAwarded: reward.xp, objectivesCompletedFraction: fraction, newBadges: [] });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  // Section 23: the 4 concise post-completion ratings. One per attempt —
  // you're rating the specific experience you had, not re-voting on the
  // quest in the abstract.
  router.post('/:id/rating', requireAuth(), idempotent(pool, 'attempts.rating'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const ownership = await getAttemptOwnership(pool, id);
      if (!requireOwnAttempt(ownership, req.session.userId)) {
        next(Errors.notFound('Attempt'));
        return;
      }
      if (ownership!.state !== 'completed' && ownership!.state !== 'partially_completed') {
        next(Errors.conflict('Only a completed or partially completed attempt can be rated.'));
        return;
      }
      const input = ratingSchema.parse(req.body);
      await submitRating(
        pool,
        id,
        ownership!.questId,
        req.session.userId as string,
        input,
        input.reviewText,
      );
      res.status(201).json({ submitted: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23505') {
        next(Errors.conflict('You have already rated this attempt.'));
        return;
      }
      next(err);
    }
  });

  return router;
}
