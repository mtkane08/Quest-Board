import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { idempotent } from '../../middleware/idempotency.js';
import { Errors } from '../../lib/errors.js';
import { evaluateFeasibility } from '../feasibility/service.js';
import { persistFeasibilityResult } from '../feasibility/repository.js';
import { createAppeal, openModerationCase } from '../moderation/repository.js';
import { userHasPermission } from '../identity/service.js';
import { isCreatorTrusted, recordReputationEvent } from '../reputation/repository.js';
import { buildOfflinePacket } from '../offline/packetBuilder.js';
import { calculateTier, validateFactorScores } from '../tiering/calculateTier.js';
import { getQuestDetail } from './repository.js';
import {
  buildFeasibilityInput,
  createQuestDraft,
  getQuestOwnership,
  isEditable,
  updateQuestDraft,
  type DraftQuestInput,
} from './writeRepository.js';

const uuidSchema = z.string().uuid();

const accessibilityStateSchema = z.enum(['confirmed', 'reported', 'partially', 'not_accessible', 'unknown']);

const factorScoresSchema = z.object({
  time_commitment: z.number().int().min(1).max(5),
  physical_effort: z.number().int().min(1).max(5),
  mental_challenge: z.number().int().min(1).max(5),
  travel_complexity: z.number().int().min(1).max(5),
  cost_burden: z.number().int().min(1).max(5),
  preparation: z.number().int().min(1).max(5),
  required_skill: z.number().int().min(1).max(5),
  objective_complexity: z.number().int().min(1).max(5),
  group_coordination: z.number().int().min(1).max(5),
});

const draftSchema = z.object({
  title: z.string().min(3).max(200),
  plainSummary: z.string().min(3).max(300),
  narratedDescription: z.string().max(4000).nullable().default(null),
  guildKey: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  factorScores: factorScoresSchema,
  audience: z.string().default('any'),
  durationMinMinutes: z.number().positive().nullable().default(null),
  durationMaxMinutes: z.number().positive().nullable().default(null),
  costMinCents: z.number().nonnegative().nullable().default(null),
  costMaxCents: z.number().nonnegative().nullable().default(null),
  travelMode: z.enum(['walk', 'cycle', 'drive', 'transit', 'any']).nullable().default(null),
  physicalIntensity: z.number().int().min(1).max(5).nullable().default(null),
  mentalIntensity: z.number().int().min(1).max(5).nullable().default(null),
  riskRating: z.enum(['low', 'moderate', 'high', 'severe']).default('low'),
  accessibilityProfile: z.object({
    wheelchair: accessibilityStateSchema,
    low_walking: accessibilityStateSchema,
    sensory_friendly: accessibilityStateSchema,
    service_animal: accessibilityStateSchema,
    restroom_access: accessibilityStateSchema,
  }),
  ageRestrictions: z.object({
    min_age: z.number().int().positive().nullable().default(null),
    adult_content: z.boolean().default(false),
    alcohol: z.boolean().default(false),
    gambling: z.boolean().default(false),
  }),
  structureType: z.string().default('single_objective'),
  objectives: z.array(z.string().min(1)).default([]),
  completionMethods: z.array(z.string()).default([]),
  requiredEquipment: z.array(z.string()).default([]),
  safetyNotes: z.string().max(2000).nullable().default(null),
  places: z
    .array(
      z.object({
        role: z.enum(['primary', 'stop']),
        placeName: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .max(10)
    .default([]),
  aiAssisted: z.boolean().default(false),
});

function handleZodError(err: unknown, next: (e: unknown) => void): boolean {
  if (err instanceof z.ZodError) {
    next(Errors.validation(err.flatten()));
    return true;
  }
  return false;
}

/**
 * QB-031: safety/accessibility/cost/time/travel/equipment/age/cancellation
 * are visible on the read response regardless of spoilers — nothing here is
 * gated behind starting the quest first. Write endpoints below implement
 * the Forge/feasibility vertical slice (Gate 4): create/edit a draft,
 * submit it through the mandatory feasibility gate (ADR-009), and publish.
 */
export function questCatalogRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/mine', requireAuth(), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT q.id AS quest_id, qv.title, qv.status, qv.feasibility_confidence, q.created_at
         FROM quests q JOIN quest_versions qv ON qv.id = q.current_version_id
         WHERE q.owner_id = $1 ORDER BY q.created_at DESC`,
        [req.session.userId],
      );
      res.json({ quests: result.rows });
    } catch (err) {
      next(err);
    }
  });

  // Section 12/46: "saved quests" — pulled forward into Gate 5 per Section
  // 47's Gate 5 scope list, even though the data model groups SavedQuest
  // with the Party/Invitation tables that are Gate 6 work.
  router.get('/saved', requireAuth(), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT q.id AS quest_id, qv.title, qv.overall_tier, sq.saved_at
         FROM saved_quests sq
         JOIN quests q ON q.id = sq.quest_id
         JOIN quest_versions qv ON qv.id = q.current_version_id
         WHERE sq.user_id = $1 ORDER BY sq.saved_at DESC`,
        [req.session.userId],
      );
      res.json({ quests: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/save', requireAuth(), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      await pool.query(
        `INSERT INTO saved_quests (user_id, quest_id) VALUES ($1, $2) ON CONFLICT (user_id, quest_id) DO NOTHING`,
        [req.session.userId, id],
      );
      res.status(204).end();
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.delete('/:id/save', requireAuth(), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      await pool.query(`DELETE FROM saved_quests WHERE user_id = $1 AND quest_id = $2`, [req.session.userId, id]);
      res.status(204).end();
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const quest = await getQuestDetail(pool, id);
      if (!quest) {
        next(Errors.notFound('Quest'));
        return;
      }
      res.json({ quest });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  // Section 30: downloadable offline quest packet.
  router.get('/:id/packet', async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const quest = await getQuestDetail(pool, id);
      if (!quest) {
        next(Errors.notFound('Quest'));
        return;
      }
      res.json({ packet: buildOfflinePacket(quest) });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.post('/', requireAuth(), async (req, res, next) => {
    try {
      const allowed = await userHasPermission(pool, req.session.userId as string, 'create', 'quest', 'own');
      if (!allowed) {
        next(Errors.forbidden('create', 'quest'));
        return;
      }
      const input = draftSchema.parse(req.body) as DraftQuestInput;
      const scoreErrors = validateFactorScores(input.factorScores);
      if (scoreErrors.length > 0) {
        next(Errors.validation(scoreErrors));
        return;
      }
      const tier = calculateTier(input.factorScores);
      const { questId, versionId } = await createQuestDraft(pool, req.session.userId as string, input, tier);
      res.status(201).json({ questId, versionId, tier: tier.tier });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.patch('/:id', requireAuth(), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const ownership = await getQuestOwnership(pool, id);
      if (!ownership) {
        next(Errors.notFound('Quest'));
        return;
      }
      if (ownership.ownerId !== req.session.userId) {
        next(Errors.forbidden('edit', 'quest'));
        return;
      }
      if (!isEditable(ownership.status)) {
        next(Errors.conflict(`Quest is in status "${ownership.status}" and cannot be edited directly.`));
        return;
      }
      const input = draftSchema.parse(req.body) as DraftQuestInput;
      const scoreErrors = validateFactorScores(input.factorScores);
      if (scoreErrors.length > 0) {
        next(Errors.validation(scoreErrors));
        return;
      }
      const tier = calculateTier(input.factorScores);
      await updateQuestDraft(pool, ownership.currentVersionId, input, tier);
      if (ownership.status === 'needs_correction') {
        await pool.query(`UPDATE quest_versions SET status = 'draft' WHERE id = $1`, [ownership.currentVersionId]);
      }
      res.json({ versionId: ownership.currentVersionId, tier: tier.tier });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.post('/:id/submit', requireAuth(), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const ownership = await getQuestOwnership(pool, id);
      if (!ownership) {
        next(Errors.notFound('Quest'));
        return;
      }
      if (ownership.ownerId !== req.session.userId) {
        next(Errors.forbidden('submit', 'quest'));
        return;
      }
      if (ownership.status !== 'draft' && ownership.status !== 'ai_generated') {
        next(Errors.conflict(`Quest is in status "${ownership.status}" and cannot be submitted from there.`));
        return;
      }

      const feasibilityInput = await buildFeasibilityInput(pool, ownership.currentVersionId);
      const assessment = evaluateFeasibility(feasibilityInput);
      await persistFeasibilityResult(pool, ownership.currentVersionId, assessment);

      let newStatus: string;
      let moderationCaseId: string | null = null;

      if (assessment.overallConfidence === 'low' || assessment.overallConfidence === 'critical_unknown') {
        newStatus = 'needs_correction';
      } else {
        // ADR from Gate 6: trust is a manual override OR an earned
        // reputation score, never just the raw creator_trust column
        // (see modules/reputation/trust.ts for why that distinction matters).
        const isTrusted = await isCreatorTrusted(pool, req.session.userId as string);
        const isAdmin = await userHasPermission(pool, req.session.userId as string, 'publish', 'quest', 'any');

        if (isTrusted || isAdmin) {
          // QB-162: trusted creators (and staff) skip the human review queue.
          newStatus = 'approved';
          await recordReputationEvent(pool, req.session.userId as string, 'quest_approved', ownership.currentVersionId);
        } else {
          newStatus = 'submitted';
          moderationCaseId = await openModerationCase(pool, ownership.currentVersionId, req.session.userId as string);
        }
      }

      await pool.query(`UPDATE quest_versions SET status = $2 WHERE id = $1`, [ownership.currentVersionId, newStatus]);
      await pool.query(
        `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_state)
         VALUES ($1, 'submit', 'quest_version', $2, $3)`,
        [req.session.userId, ownership.currentVersionId, JSON.stringify({ status: newStatus, confidence: assessment.overallConfidence })],
      );

      res.json({ status: newStatus, feasibility: assessment, moderationCaseId });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  router.post('/:id/publish', requireAuth(), idempotent(pool, 'quests.publish'), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const ownership = await getQuestOwnership(pool, id);
      if (!ownership) {
        next(Errors.notFound('Quest'));
        return;
      }
      const isOwner = ownership.ownerId === req.session.userId;
      const isAdmin = await userHasPermission(pool, req.session.userId as string, 'publish', 'quest', 'any');
      if (!isOwner && !isAdmin) {
        next(Errors.forbidden('publish', 'quest'));
        return;
      }
      if (ownership.status !== 'approved') {
        next(Errors.conflict(`Quest is in status "${ownership.status}" — only an approved quest can be published.`));
        return;
      }
      // Use the most recent feasibility assessment's recommended scope
      // (Section 15) rather than leaving publication_scope at its 'private'
      // default forever — a published quest that's still flagged 'private'
      // would be a silent inconsistency between status and visibility.
      await pool.query(
        `UPDATE quest_versions SET status = 'published', publication_scope = COALESCE(
           (SELECT recommended_publication_scope FROM feasibility_assessments
            WHERE quest_version_id = $1 ORDER BY assessed_at DESC LIMIT 1),
           'public'
         ) WHERE id = $1`,
        [ownership.currentVersionId],
      );
      await pool.query(
        `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_state)
         VALUES ($1, 'publish', 'quest_version', $2, $3)`,
        [req.session.userId, ownership.currentVersionId, JSON.stringify({ status: 'published' })],
      );
      res.json({ status: 'published' });
    } catch (err) {
      if (handleZodError(err, next)) return;
      next(err);
    }
  });

  // Section 24/25: the owner's half of the appeal loop — see
  // apps/api/src/modules/moderation/routes.ts for the admin decision side.
  router.post('/:id/appeal', requireAuth(), async (req, res, next) => {
    try {
      const id = uuidSchema.parse(req.params.id);
      const ownership = await getQuestOwnership(pool, id);
      if (!ownership) {
        next(Errors.notFound('Quest'));
        return;
      }
      if (ownership.ownerId !== req.session.userId) {
        next(Errors.forbidden('appeal', 'quest'));
        return;
      }
      const { reasonText } = z.object({ reasonText: z.string().max(2000).nullable().default(null) }).parse(req.body);
      const appealId = await createAppeal(pool, ownership.currentVersionId, req.session.userId as string, reasonText);
      res.status(201).json({ appealId });
    } catch (err) {
      if (handleZodError(err, next)) return;
      if (err instanceof Error && 'code' in err) {
        const code = (err as { code?: string }).code;
        if (code === 'CONFLICT') {
          next(Errors.conflict(err.message));
          return;
        }
        if (code === 'NOT_FOUND') {
          next(Errors.notFound('Suspension decision'));
          return;
        }
      }
      next(err);
    }
  });

  return router;
}
