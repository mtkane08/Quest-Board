/**
 * Section 23: "Delay or qualify aggregate display until a minimum response
 * threshold to avoid one rating dominating." The threshold value itself is
 * one of DL-006's open numeric-calibration items — this module fixes the
 * *mechanism* (don't show an average built from too few responses) with a
 * documented, provisional number, same posture as tiering/reward/leveling.
 */
export const MIN_RESPONSE_THRESHOLD = 3;

export interface RatingInput {
  enjoyment: number;
  accuracy: number;
  tierAccuracy: number;
  wouldRecommend: number;
}

export interface AggregateRating {
  responseCount: number;
  isDisplayable: boolean;
  averages: {
    enjoyment: number;
    accuracy: number;
    tierAccuracy: number;
    wouldRecommend: number;
  } | null;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateAggregateRating(ratings: RatingInput[]): AggregateRating {
  const responseCount = ratings.length;
  const isDisplayable = responseCount >= MIN_RESPONSE_THRESHOLD;

  return {
    responseCount,
    isDisplayable,
    averages: isDisplayable
      ? {
          enjoyment: average(ratings.map((r) => r.enjoyment)),
          accuracy: average(ratings.map((r) => r.accuracy)),
          tierAccuracy: average(ratings.map((r) => r.tierAccuracy)),
          wouldRecommend: average(ratings.map((r) => r.wouldRecommend)),
        }
      : null,
  };
}
