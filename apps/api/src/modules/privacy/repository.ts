import type { Pool } from 'pg';

/**
 * QB-183: "Users can export and erase location, quest, inventory, and
 * AI-history data subject to lawful retention." Nothing in Gate 6 stores
 * location history or AI conversation logs yet (those are later-gate
 * scope), so this covers what actually exists today: profile, owned
 * quests, attempts, XP, badges, saved quests, inventory, ratings, reports.
 */
export async function exportUserData(pool: Pool, userId: string) {
  const [profile, quests, attempts, xp, badges, saved, inventory, ratings, reports] = await Promise.all([
    pool.query(`SELECT email, username, created_at FROM users WHERE id = $1`, [userId]),
    pool.query(
      `SELECT q.id, qv.title, qv.status FROM quests q JOIN quest_versions qv ON qv.id = q.current_version_id WHERE q.owner_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT qa.id, qv.title, qa.state, qa.started_at, qa.completed_at FROM quest_attempts qa
       JOIN quest_versions qv ON qv.id = qa.quest_version_id WHERE qa.user_id = $1`,
      [userId],
    ),
    pool.query(`SELECT COALESCE(SUM(amount), 0) AS total_xp FROM xp_events WHERE user_id = $1`, [userId]),
    pool.query(`SELECT badge_key, earned_at FROM user_badges WHERE user_id = $1`, [userId]),
    pool.query(`SELECT quest_id, saved_at FROM saved_quests WHERE user_id = $1`, [userId]),
    pool.query(`SELECT name, category, quantity FROM inventory_items WHERE user_id = $1`, [userId]),
    pool.query(`SELECT quest_id, enjoyment, accuracy, tier_accuracy, would_recommend, review_text, created_at FROM ratings WHERE user_id = $1`, [userId]),
    pool.query(`SELECT target_type, target_id, category, severity, created_at FROM reports WHERE reporter_user_id = $1`, [userId]),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.rows[0] ?? null,
    ownedQuests: quests.rows,
    attempts: attempts.rows,
    totalXp: Number(xp.rows[0]?.total_xp ?? 0),
    badges: badges.rows,
    savedQuests: saved.rows,
    inventory: inventory.rows,
    ratingsSubmitted: ratings.rows,
    reportsFiled: reports.rows,
  };
}

/**
 * A soft, PII-scrubbing erase rather than a hard row delete: `quests`,
 * `quest_attempts`, `ratings`, and `reports` have no `ON DELETE CASCADE`
 * from `users` (by design — Section 22's "deleted public content
 * disappears unless retained... for past completions, disputes, safety, or
 * audit history"), so a hard delete of the user row would either violate
 * foreign keys or silently destroy other people's shared history (e.g. a
 * rating aggregate other users rely on). Scrubbing identity while leaving
 * the historical rows in place is the compliant version of "erase" here.
 */
export async function eraseUser(pool: Pool, userId: string): Promise<void> {
  const tombstone = `erased-${userId}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET email = $2, username = $2, password_hash = 'erased', is_active = FALSE WHERE id = $1`,
      [userId, tombstone],
    );
    await client.query(`DELETE FROM profiles WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM inventory_items WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM saved_quests WHERE user_id = $1`, [userId]);
    await client.query(`UPDATE role_grants SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, reason_code)
       VALUES ($1, 'self_erase', 'user', $1, 'user_requested')`,
      [userId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
