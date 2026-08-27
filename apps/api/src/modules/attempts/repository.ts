import type { Pool } from 'pg';

export interface AttemptOwnership {
  attemptId: string;
  userId: string;
  state: string;
  questId: string;
  questVersionId: string;
}

export async function createAttempt(pool: Pool, userId: string, questId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const questResult = await client.query<{ current_version_id: string; objectives: string[]; status: string }>(
      `SELECT qv.id AS current_version_id, qv.objectives, qv.status
       FROM quests q JOIN quest_versions qv ON qv.id = q.current_version_id
       WHERE q.id = $1`,
      [questId],
    );
    const quest = questResult.rows[0];
    if (!quest) throw Object.assign(new Error('Quest not found.'), { code: 'NOT_FOUND' });
    if (quest.status !== 'published') {
      throw Object.assign(new Error('Only published quests can be attempted.'), { code: 'CONFLICT' });
    }

    const attemptResult = await client.query<{ id: string }>(
      `INSERT INTO quest_attempts (quest_version_id, quest_id, user_id, state, started_at)
       VALUES ($1, $2, $3, 'active', NOW()) RETURNING id`,
      [quest.current_version_id, questId, userId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) throw new Error('Attempt creation returned no row.');

    for (const [index, text] of (quest.objectives ?? []).entries()) {
      await client.query(
        `INSERT INTO attempt_objectives (attempt_id, sequence_order, text) VALUES ($1, $2, $3)`,
        [attempt.id, index, text],
      );
    }

    await client.query('COMMIT');
    return attempt.id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAttemptOwnership(pool: Pool, attemptId: string): Promise<AttemptOwnership | null> {
  const result = await pool.query(
    `SELECT id, user_id, state, quest_id, quest_version_id FROM quest_attempts WHERE id = $1`,
    [attemptId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { attemptId: row.id, userId: row.user_id, state: row.state, questId: row.quest_id, questVersionId: row.quest_version_id };
}

export async function setAttemptState(pool: Pool, attemptId: string, state: string, extra?: Record<string, unknown>): Promise<void> {
  const setClauses = ['state = $2'];
  const params: unknown[] = [attemptId, state];
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }
  await pool.query(`UPDATE quest_attempts SET ${setClauses.join(', ')} WHERE id = $1`, params);
}

export async function getAttemptObjectives(pool: Pool, attemptId: string): Promise<Array<{ id: string; text: string; completedAt: string | null }>> {
  const result = await pool.query(
    `SELECT id, text, completed_at FROM attempt_objectives WHERE attempt_id = $1 ORDER BY sequence_order`,
    [attemptId],
  );
  return result.rows.map((r) => ({ id: r.id, text: r.text, completedAt: r.completed_at }));
}

export async function recordEvidence(
  pool: Pool,
  attemptId: string,
  objectiveId: string | null,
  type: string,
  note: string | null,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO evidence (attempt_id, objective_id, type, note) VALUES ($1, $2, $3, $4)`,
      [attemptId, objectiveId, type, note],
    );
    if (objectiveId) {
      await client.query(`UPDATE attempt_objectives SET completed_at = NOW() WHERE id = $1 AND attempt_id = $2`, [
        objectiveId,
        attemptId,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getPriorCompletionCount(pool: Pool, userId: string, questId: string, excludingAttemptId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM quest_attempts
     WHERE user_id = $1 AND quest_id = $2 AND id != $3 AND state IN ('completed', 'partially_completed')`,
    [userId, questId, excludingAttemptId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getUserCompletionCount(pool: Pool, userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM quest_attempts WHERE user_id = $1 AND state = 'completed'`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function finalizeAttemptCompletion(
  pool: Pool,
  attemptId: string,
  userId: string,
  questId: string,
  outcome: 'completed' | 'partially_completed',
  xp: number,
  rewardVersion: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE quest_attempts SET state = $2, completed_at = NOW() WHERE id = $1`, [attemptId, outcome]);
    await client.query(
      `INSERT INTO completion_decisions (attempt_id, decided_by, decision) VALUES ($1, 'system', $2)`,
      [attemptId, outcome],
    );
    await client.query(
      `INSERT INTO xp_events (user_id, quest_id, source_type, source_ref, amount, reward_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, questId, outcome === 'completed' ? 'attempt_completion' : 'attempt_partial_completion', attemptId, xp, rewardVersion],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function awardBadges(pool: Pool, userId: string, badgeKeys: string[]): Promise<void> {
  for (const key of badgeKeys) {
    await pool.query(
      `INSERT INTO user_badges (user_id, badge_key) VALUES ($1, $2) ON CONFLICT (user_id, badge_key) DO NOTHING`,
      [userId, key],
    );
  }
}
