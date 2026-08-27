import type { Pool } from 'pg';
import { calculateAggregateRating, type AggregateRating, type RatingInput } from './aggregate.js';

export async function submitRating(
  pool: Pool,
  attemptId: string,
  questId: string,
  userId: string,
  input: RatingInput,
  reviewText: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO ratings (attempt_id, quest_id, user_id, enjoyment, accuracy, tier_accuracy, would_recommend, review_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [attemptId, questId, userId, input.enjoyment, input.accuracy, input.tierAccuracy, input.wouldRecommend, reviewText],
  );
}

export async function getAggregateRatingForQuest(pool: Pool, questId: string): Promise<AggregateRating> {
  const result = await pool.query<{ enjoyment: number; accuracy: number; tier_accuracy: number; would_recommend: number }>(
    `SELECT enjoyment, accuracy, tier_accuracy, would_recommend FROM ratings WHERE quest_id = $1`,
    [questId],
  );
  return calculateAggregateRating(
    result.rows.map((r) => ({
      enjoyment: r.enjoyment,
      accuracy: r.accuracy,
      tierAccuracy: r.tier_accuracy,
      wouldRecommend: r.would_recommend,
    })),
  );
}
