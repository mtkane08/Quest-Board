import { describe, expect, it } from 'vitest';
import { calculateTier, validateFactorScores, weightedMean, type FactorScores } from '../src/modules/tiering/calculateTier.js';

const allOnes: FactorScores = {
  time_commitment: 1, physical_effort: 1, mental_challenge: 1, travel_complexity: 1,
  cost_burden: 1, preparation: 1, required_skill: 1, objective_complexity: 1, group_coordination: 1,
};
const allFives: FactorScores = {
  time_commitment: 5, physical_effort: 5, mental_challenge: 5, travel_complexity: 5,
  cost_burden: 5, preparation: 5, required_skill: 5, objective_complexity: 5, group_coordination: 5,
};

describe('calculateTier (spec Section 11)', () => {
  it('weights sum to 1.0 (100%) so a uniform score reproduces itself', () => {
    expect(weightedMean(allOnes)).toBeCloseTo(1, 5);
    expect(weightedMean(allFives)).toBeCloseTo(5, 5);
  });

  it('classifies the minimum possible score as novice', () => {
    expect(calculateTier(allOnes).tier).toBe('novice');
  });

  it('classifies the maximum possible score as mythic', () => {
    expect(calculateTier(allFives).tier).toBe('mythic');
  });

  it('weighs time_commitment and physical_effort more heavily than the 10%-weight factors', () => {
    const heavyOnTime: FactorScores = { ...allOnes, time_commitment: 5, physical_effort: 5 };
    const heavyOnMinorFactor: FactorScores = { ...allOnes, mental_challenge: 5 };
    expect(weightedMean(heavyOnTime)).toBeGreaterThan(weightedMean(heavyOnMinorFactor));
  });

  it('never averages risk into the tier score — risk is not one of the 9 factors', () => {
    const keys = Object.keys(allOnes);
    expect(keys).not.toContain('risk');
    expect(keys).not.toContain('risk_rating');
  });

  it('validateFactorScores rejects a missing factor', () => {
    const { time_commitment, ...incomplete } = allOnes;
    void time_commitment;
    expect(validateFactorScores(incomplete)).toEqual(
      expect.arrayContaining([expect.stringContaining('time_commitment')]),
    );
  });

  it('validateFactorScores rejects an out-of-range or non-integer value', () => {
    expect(validateFactorScores({ ...allOnes, cost_burden: 6 })).toEqual(
      expect.arrayContaining([expect.stringContaining('cost_burden')]),
    );
    expect(validateFactorScores({ ...allOnes, cost_burden: 2.5 })).toEqual(
      expect.arrayContaining([expect.stringContaining('cost_burden')]),
    );
  });

  it('validateFactorScores accepts a fully valid set', () => {
    expect(validateFactorScores(allOnes)).toEqual([]);
  });
});
