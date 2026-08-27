import type { Pool } from 'pg';
import { computeIsTrusted, computeReputationScore, REPUTATION_POINTS, type ReputationEventType } from './trust.js';

export async function recordReputationEvent(
  pool: Pool,
  userId: string,
  eventType: ReputationEventType,
  sourceRef: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO reputation_events (user_id, event_type, points, source_ref) VALUES ($1, $2, $3, $4)`,
    [userId, eventType, REPUTATION_POINTS[eventType], sourceRef],
  );
}

export async function isCreatorTrusted(pool: Pool, userId: string): Promise<boolean> {
  const userResult = await pool.query<{ creator_trust: boolean | null }>(
    `SELECT creator_trust FROM users WHERE id = $1`,
    [userId],
  );
  const manualOverride = userResult.rows[0]?.creator_trust ?? undefined;

  const eventsResult = await pool.query<{ event_type: ReputationEventType; points: number }>(
    `SELECT event_type, points FROM reputation_events WHERE user_id = $1`,
    [userId],
  );
  const score = computeReputationScore(eventsResult.rows.map((r) => ({ eventType: r.event_type, points: r.points })));

  return computeIsTrusted(score, manualOverride ?? undefined);
}
