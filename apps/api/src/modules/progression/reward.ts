import type { Tier } from '../tiering/calculateTier.js';

/**
 * Spec Section 19 requires XP/reward calculation to resist farming via
 * "diminishing returns, duplicate restrictions, anomaly checks" — and
 * Section 18 requires partial XP for partial completion. Both rules are
 * pure functions of (tier, how much was actually done, how many times this
 * exact quest has already been completed by this user) so they're fully
 * unit-testable without a database, same as calculateTier/evaluateFeasibility.
 *
 * Base XP values are provisional pending DL-006's calibration exercise —
 * same caveat as the tier thresholds.
 */
export const BASE_XP_BY_TIER: Record<Tier, number> = {
  novice: 10,
  adventurer: 25,
  heroic: 50,
  legendary: 100,
  mythic: 200,
};

export const REWARD_CALCULATION_VERSION = 'v1-inverse-diminishing-provisional';

/**
 * 1st completion of a given quest: full multiplier. Each subsequent
 * completion of the *same* quest by the *same* user is worth progressively
 * less — 1/2, 1/3, 1/4, ... — without ever hitting a punitive hard zero
 * (Section 19: "avoid punitive streak loss" extends in spirit to not
 * zeroing out a repeat player's effort entirely).
 */
export function diminishingMultiplier(priorCompletionCount: number): number {
  if (priorCompletionCount < 0) throw new Error('priorCompletionCount cannot be negative');
  return 1 / (priorCompletionCount + 1);
}

export interface RewardInput {
  tier: Tier;
  /** 1.0 for a full completion; fraction of objectives done for a partial one. */
  objectivesCompletedFraction: number;
  /** How many times this user has already completed this exact quest before. */
  priorCompletionCount: number;
}

export function calculateReward(input: RewardInput): { xp: number; version: string } {
  const fraction = Math.max(0, Math.min(1, input.objectivesCompletedFraction));
  const base = BASE_XP_BY_TIER[input.tier];
  const xp = Math.round(base * fraction * diminishingMultiplier(input.priorCompletionCount));
  return { xp, version: REWARD_CALCULATION_VERSION };
}
