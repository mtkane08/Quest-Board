import { describe, expect, it } from 'vitest';
import { calculateReward, diminishingMultiplier } from '../src/modules/progression/reward.js';
import { calculateLevel } from '../src/modules/progression/leveling.js';
import { evaluateNewBadges } from '../src/modules/progression/badges.js';
import { calculateCurrentStreak } from '../src/modules/progression/streak.js';

describe('calculateReward (Section 18-19)', () => {
  it('awards full base XP for a first, full completion', () => {
    const result = calculateReward({ tier: 'adventurer', objectivesCompletedFraction: 1, priorCompletionCount: 0 });
    expect(result.xp).toBe(25);
  });

  it('awards proportional XP for a partial completion', () => {
    const result = calculateReward({ tier: 'heroic', objectivesCompletedFraction: 0.5, priorCompletionCount: 0 });
    expect(result.xp).toBe(25); // 50 * 0.5
  });

  it('diminishes reward on repeat completions of the same quest without ever going punitive-zero', () => {
    const first = calculateReward({ tier: 'novice', objectivesCompletedFraction: 1, priorCompletionCount: 0 });
    const second = calculateReward({ tier: 'novice', objectivesCompletedFraction: 1, priorCompletionCount: 1 });
    const tenth = calculateReward({ tier: 'novice', objectivesCompletedFraction: 1, priorCompletionCount: 9 });
    expect(second.xp).toBeLessThan(first.xp);
    expect(tenth.xp).toBeLessThan(second.xp);
    expect(tenth.xp).toBeGreaterThan(0);
  });

  it('clamps an out-of-range fraction rather than producing negative or inflated XP', () => {
    const negative = calculateReward({ tier: 'mythic', objectivesCompletedFraction: -1, priorCompletionCount: 0 });
    const over = calculateReward({ tier: 'mythic', objectivesCompletedFraction: 2, priorCompletionCount: 0 });
    expect(negative.xp).toBe(0);
    expect(over.xp).toBe(200);
  });

  it('rejects a negative prior-completion count', () => {
    expect(() => diminishingMultiplier(-1)).toThrow();
  });
});

describe('calculateLevel (Section 19)', () => {
  it('starts everyone at level 1 with 0 XP', () => {
    expect(calculateLevel(0)).toMatchObject({ level: 1, rank: 'Wayfarer' });
  });

  it('advances level as thresholds are crossed', () => {
    expect(calculateLevel(49).level).toBe(1);
    expect(calculateLevel(50).level).toBe(2);
  });

  it('reports the next level threshold, and null at the top of the table', () => {
    expect(calculateLevel(0).nextLevelXp).toBe(50);
    expect(calculateLevel(999999).nextLevelXp).toBeNull();
  });
});

describe('evaluateNewBadges (Section 19)', () => {
  it('awards "first_completion" only when crossing from 0 to 1', () => {
    expect(evaluateNewBadges(0, 1).map((b) => b.key)).toEqual(['first_completion']);
    expect(evaluateNewBadges(1, 2)).toEqual([]);
  });

  it('never re-awards a badge already crossed', () => {
    expect(evaluateNewBadges(5, 6)).toEqual([]);
  });

  it('awards multiple badges at once if a jump crosses more than one threshold', () => {
    const keys = evaluateNewBadges(0, 5).map((b) => b.key);
    expect(keys).toEqual(['first_completion', 'five_completions']);
  });
});

describe('calculateCurrentStreak (Section 19: no punitive streak loss)', () => {
  it('is 0 with no completions', () => {
    expect(calculateCurrentStreak([], '2026-08-26T12:00:00Z')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const dates = ['2026-08-24T09:00:00Z', '2026-08-25T09:00:00Z', '2026-08-26T09:00:00Z'];
    expect(calculateCurrentStreak(dates, '2026-08-26T18:00:00Z')).toBe(3);
  });

  it('still reports yesterday\'s streak if nothing has happened yet today (not reset to 0 mid-day)', () => {
    const dates = ['2026-08-24T09:00:00Z', '2026-08-25T09:00:00Z'];
    expect(calculateCurrentStreak(dates, '2026-08-26T08:00:00Z')).toBe(2);
  });

  it('a gap stops the streak without deleting the fact that earlier days happened', () => {
    const dates = ['2026-08-20T09:00:00Z', '2026-08-25T09:00:00Z', '2026-08-26T09:00:00Z'];
    expect(calculateCurrentStreak(dates, '2026-08-26T12:00:00Z')).toBe(2);
  });

  it('multiple completions on the same day only count once', () => {
    const dates = ['2026-08-26T09:00:00Z', '2026-08-26T15:00:00Z'];
    expect(calculateCurrentStreak(dates, '2026-08-26T18:00:00Z')).toBe(1);
  });
});
