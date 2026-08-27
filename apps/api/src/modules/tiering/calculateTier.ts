/**
 * Spec Section 11: 9 weighted factors (1-5 each) combine into an overall
 * tier via "calibrated thresholds." The weights are normative (they're
 * spelled out in the spec); the thresholds are not — DL-006 in
 * docs/gate-0/06-decision-log.md leaves the actual cutoffs as an open
 * calibration exercise. This module implements the weighting exactly as
 * specified and uses equal-width bins as a documented, versioned
 * placeholder for the thresholds, so tier assignment isn't blocked on a
 * decision that hasn't been made yet — but it must not be mistaken for a
 * validated calibration.
 */

export type Tier = 'novice' | 'adventurer' | 'heroic' | 'legendary' | 'mythic';

export interface FactorScores {
  time_commitment: number;
  physical_effort: number;
  mental_challenge: number;
  travel_complexity: number;
  cost_burden: number;
  preparation: number;
  required_skill: number;
  objective_complexity: number;
  group_coordination: number;
}

// Spec Section 11, verbatim.
const WEIGHTS: Record<keyof FactorScores, number> = {
  time_commitment: 0.15,
  physical_effort: 0.15,
  mental_challenge: 0.1,
  travel_complexity: 0.1,
  cost_burden: 0.1,
  preparation: 0.1,
  required_skill: 0.1,
  objective_complexity: 0.1,
  group_coordination: 0.1,
};

export const TIER_CALCULATION_VERSION = 'v1-equal-width-bins-provisional';

const FACTOR_KEYS = Object.keys(WEIGHTS) as Array<keyof FactorScores>;

export function validateFactorScores(scores: Partial<FactorScores>): string[] {
  const errors: string[] = [];
  for (const key of FACTOR_KEYS) {
    const value = scores[key];
    if (value === undefined) {
      errors.push(`Missing factor score: ${key}`);
    } else if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.push(`Factor score ${key} must be an integer from 1 to 5, got ${value}`);
    }
  }
  return errors;
}

export function weightedMean(scores: FactorScores): number {
  let sum = 0;
  for (const key of FACTOR_KEYS) {
    sum += scores[key] * WEIGHTS[key];
  }
  return sum;
}

/**
 * Equal-width bins over the possible [1, 5] weighted-mean range —
 * intentionally the simplest defensible default, not a claim that these
 * cutoffs are correct. Revisit against real seed-template calibration per
 * DL-006 before relying on this for anything user-facing beyond a rough
 * label.
 */
export function tierFromScore(score: number): Tier {
  if (score < 1.8) return 'novice';
  if (score < 2.6) return 'adventurer';
  if (score < 3.4) return 'heroic';
  if (score < 4.2) return 'legendary';
  return 'mythic';
}

export function calculateTier(scores: FactorScores): { tier: Tier; score: number; version: string } {
  const score = weightedMean(scores);
  return { tier: tierFromScore(score), score, version: TIER_CALCULATION_VERSION };
}
