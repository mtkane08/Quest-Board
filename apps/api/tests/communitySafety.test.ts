import { describe, expect, it } from 'vitest';
import { calculateAggregateRating, MIN_RESPONSE_THRESHOLD } from '../src/modules/ratings/aggregate.js';
import { computeIsTrusted, computeReputationScore } from '../src/modules/reputation/trust.js';
import { calculateAgeInYears, isAdultContentEligible } from '../src/modules/identity/ageEligibility.js';

const rating = (n: number) => ({ enjoyment: n, accuracy: n, tierAccuracy: n, wouldRecommend: n });

describe('calculateAggregateRating (Section 23)', () => {
  it('is not displayable below the minimum response threshold', () => {
    const ratings = Array.from({ length: MIN_RESPONSE_THRESHOLD - 1 }, () => rating(5));
    const result = calculateAggregateRating(ratings);
    expect(result.isDisplayable).toBe(false);
    expect(result.averages).toBeNull();
  });

  it('becomes displayable exactly at the threshold', () => {
    const ratings = Array.from({ length: MIN_RESPONSE_THRESHOLD }, () => rating(4));
    const result = calculateAggregateRating(ratings);
    expect(result.isDisplayable).toBe(true);
    expect(result.averages).toEqual({ enjoyment: 4, accuracy: 4, tierAccuracy: 4, wouldRecommend: 4 });
  });

  it('averages each of the four dimensions independently', () => {
    const ratings = [
      { enjoyment: 5, accuracy: 3, tierAccuracy: 1, wouldRecommend: 5 },
      { enjoyment: 3, accuracy: 3, tierAccuracy: 3, wouldRecommend: 3 },
      { enjoyment: 1, accuracy: 3, tierAccuracy: 5, wouldRecommend: 1 },
    ];
    const result = calculateAggregateRating(ratings);
    expect(result.averages).toEqual({ enjoyment: 3, accuracy: 3, tierAccuracy: 3, wouldRecommend: 3 });
  });

  it('one extreme rating cannot dominate below the threshold, and is diluted above it', () => {
    const oneBad = [rating(1)];
    expect(calculateAggregateRating(oneBad).isDisplayable).toBe(false);
    const dilutedBad = [rating(1), rating(5), rating(5)];
    expect(calculateAggregateRating(dilutedBad).averages?.enjoyment).toBeCloseTo(3.67, 1);
  });
});

describe('creator trust (Section 24)', () => {
  it('sums reputation events into a score', () => {
    expect(
      computeReputationScore([
        { eventType: 'quest_approved', points: 1 },
        { eventType: 'quest_approved', points: 1 },
        { eventType: 'quest_rejected', points: -1 },
      ]),
    ).toBe(1);
  });

  it('grants trust once earned score crosses the threshold with no manual override', () => {
    expect(computeIsTrusted(2, undefined)).toBe(false);
    expect(computeIsTrusted(3, undefined)).toBe(true);
  });

  it('a manual override always wins, in either direction', () => {
    expect(computeIsTrusted(10, false)).toBe(false); // "trusted status can be suspended"
    expect(computeIsTrusted(-5, true)).toBe(true); // an admin can also hand-grant trust early
  });
});

describe('isAdultContentEligible (Section 8)', () => {
  it('excludes by default when no birth date is on file', () => {
    expect(isAdultContentEligible(null, '2026-08-26T00:00:00Z')).toBe(false);
  });

  it('calculates age correctly across a birthday boundary', () => {
    expect(calculateAgeInYears('2000-08-26', '2026-08-25T00:00:00Z')).toBe(25);
    expect(calculateAgeInYears('2000-08-26', '2026-08-26T00:00:00Z')).toBe(26);
  });

  it('excludes someone under the threshold and includes someone at or over it', () => {
    expect(isAdultContentEligible('2010-01-01', '2026-08-26T00:00:00Z')).toBe(false); // 16
    expect(isAdultContentEligible('2000-01-01', '2026-08-26T00:00:00Z')).toBe(true); // 26
  });

  it('never assumes eligibility just because no contrary data exists (Principle 10\'s sibling rule for age)', () => {
    // Same day as the 21st birthday should already count.
    expect(isAdultContentEligible('2005-08-26', '2026-08-26T00:00:00Z')).toBe(true);
    // One day before should not.
    expect(isAdultContentEligible('2005-08-27', '2026-08-26T00:00:00Z')).toBe(false);
  });
});
