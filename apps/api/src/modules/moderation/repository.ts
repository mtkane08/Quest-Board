import type { Pool } from 'pg';
import { REPUTATION_POINTS } from '../reputation/trust.js';

export async function openModerationCase(pool: Pool, questVersionId: string, openedBy: string | null): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO moderation_cases (target_type, target_id, opened_by) VALUES ('quest_version', $1, $2) RETURNING id`,
    [questVersionId, openedBy],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Moderation case creation returned no row.');
  return row.id;
}

export interface ModerationCase {
  id: string;
  targetId: string;
  status: string;
  openedAt: string;
}

export async function getOpenModerationCase(pool: Pool, id: string): Promise<ModerationCase | null> {
  const result = await pool.query(
    `SELECT id, target_id, status, opened_at FROM moderation_cases WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.id, targetId: row.target_id, status: row.status, openedAt: row.opened_at };
}

export type ModerationDecision = 'approve' | 'request_changes' | 'suspend';

/**
 * Handles two distinct situations the same "decide" action can apply to
 * (docs/gate-1/06-state-machines.md): a fresh creator `Submitted` for
 * ordinary review (approve → Approved, request_changes → NeedsCorrection),
 * or an already-`Flagged` published quest reported by the community
 * (approve → dismiss the flag back to Published, suspend → Suspended). The
 * decision options valid for one don't apply to the other — validated
 * here rather than trusted from the caller.
 */
export async function decideModerationCase(
  pool: Pool,
  caseId: string,
  decision: ModerationDecision,
  decidedBy: string,
  reasonCode: string | undefined,
): Promise<{ newStatus: string; creatorUserId: string | null }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const caseRow = await client.query<{ target_id: string }>(
      `SELECT target_id FROM moderation_cases WHERE id = $1 AND status = 'open' FOR UPDATE`,
      [caseId],
    );
    const target = caseRow.rows[0];
    if (!target) throw Object.assign(new Error('Moderation case not found or already decided.'), { code: 'NOT_FOUND' });

    const questVersion = await client.query<{ status: string; owner_id: string | null }>(
      `SELECT qv.status, q.owner_id FROM quest_versions qv JOIN quests q ON q.id = qv.quest_id WHERE qv.id = $1`,
      [target.target_id],
    );
    const currentStatus = questVersion.rows[0]?.status;
    const creatorUserId = questVersion.rows[0]?.owner_id ?? null;

    let newQuestStatus: string;
    let caseOutcome: string;
    let reputationEvent: keyof typeof REPUTATION_POINTS | null = null;

    if (currentStatus === 'submitted') {
      if (decision === 'suspend') {
        throw Object.assign(new Error('"suspend" is not valid for a case still in ordinary submission review.'), { code: 'VALIDATION' });
      }
      newQuestStatus = decision === 'approve' ? 'approved' : 'needs_correction';
      caseOutcome = decision === 'approve' ? 'approved' : 'changes_requested';
      reputationEvent = decision === 'approve' ? 'quest_approved' : 'quest_rejected';
    } else if (currentStatus === 'flagged') {
      if (decision === 'request_changes') {
        throw Object.assign(new Error('"request_changes" is not valid for a flagged (reported) quest — use "approve" to dismiss or "suspend" to uphold.'), { code: 'VALIDATION' });
      }
      newQuestStatus = decision === 'approve' ? 'published' : 'suspended';
      caseOutcome = decision === 'approve' ? 'approved' : 'suspended';
      reputationEvent = decision === 'suspend' ? 'report_upheld_against' : null;
    } else {
      throw Object.assign(new Error(`Quest is in status "${currentStatus}" — not awaiting a moderation decision.`), { code: 'CONFLICT' });
    }

    await client.query(
      `UPDATE moderation_cases SET status = $2, decided_by = $3, reason_code = $4, decided_at = NOW() WHERE id = $1`,
      [caseId, caseOutcome, decidedBy, reasonCode ?? null],
    );
    await client.query(`UPDATE quest_versions SET status = $2 WHERE id = $1`, [target.target_id, newQuestStatus]);

    if (reputationEvent && creatorUserId) {
      await client.query(
        `INSERT INTO reputation_events (user_id, event_type, points, source_ref) VALUES ($1, $2, $3, $4)`,
        [creatorUserId, reputationEvent, REPUTATION_POINTS[reputationEvent], target.target_id],
      );
    }

    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, reason_code, after_state)
       VALUES ($1, 'moderation_decision', 'quest_version', $2, $3, $4)`,
      [decidedBy, target.target_id, reasonCode ?? null, JSON.stringify({ decision, newQuestStatus })],
    );

    await client.query('COMMIT');
    return { newStatus: newQuestStatus, creatorUserId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Section 24/25: "support appeals." Only the most recent *suspended*
 * outcome for a quest can be appealed — appealing a decision the creator
 * simply disagrees with (a `changes_requested` on ordinary submission
 * review) is intentionally out of scope; that path is "revise and
 * resubmit," not an appeal.
 */
export async function createAppeal(pool: Pool, questVersionId: string, appellantUserId: string, reasonText: string | null): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const versionResult = await client.query<{ status: string }>(
      `SELECT status FROM quest_versions WHERE id = $1 FOR UPDATE`,
      [questVersionId],
    );
    if (versionResult.rows[0]?.status !== 'suspended') {
      throw Object.assign(new Error('Only a suspended quest can be appealed.'), { code: 'CONFLICT' });
    }
    const caseResult = await client.query<{ id: string }>(
      `SELECT id FROM moderation_cases WHERE target_type = 'quest_version' AND target_id = $1 AND status = 'suspended'
       ORDER BY decided_at DESC LIMIT 1`,
      [questVersionId],
    );
    const moderationCase = caseResult.rows[0];
    if (!moderationCase) throw Object.assign(new Error('No suspension decision found to appeal.'), { code: 'NOT_FOUND' });

    const existing = await client.query(
      `SELECT id FROM appeals WHERE moderation_case_id = $1 AND state = 'open'`,
      [moderationCase.id],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw Object.assign(new Error('An appeal is already open for this suspension.'), { code: 'CONFLICT' });
    }

    const appealResult = await client.query<{ id: string }>(
      `INSERT INTO appeals (moderation_case_id, appellant_user_id, reason_text) VALUES ($1, $2, $3) RETURNING id`,
      [moderationCase.id, appellantUserId, reasonText],
    );
    await client.query('COMMIT');
    return appealResult.rows[0]!.id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function decideAppeal(pool: Pool, appealId: string, decision: 'uphold' | 'deny', decidedBy: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const appealResult = await client.query<{ moderation_case_id: string }>(
      `UPDATE appeals SET state = $2, decided_by = $3, decided_at = NOW() WHERE id = $1 AND state = 'open' RETURNING moderation_case_id`,
      [appealId, decision === 'uphold' ? 'upheld' : 'denied', decidedBy],
    );
    const appeal = appealResult.rows[0];
    if (!appeal) throw Object.assign(new Error('Appeal not found or already decided.'), { code: 'NOT_FOUND' });

    const caseResult = await client.query<{ target_id: string }>(
      `SELECT target_id FROM moderation_cases WHERE id = $1`,
      [appeal.moderation_case_id],
    );
    const questVersionId = caseResult.rows[0]?.target_id;
    if (!questVersionId) throw new Error('Moderation case for this appeal has no target.');

    const newStatus = decision === 'uphold' ? 'published' : 'archived';
    await client.query(`UPDATE quest_versions SET status = $2 WHERE id = $1`, [questVersionId, newStatus]);

    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_state)
       VALUES ($1, 'appeal_decision', 'quest_version', $2, $3)`,
      [decidedBy, questVersionId, JSON.stringify({ decision, newStatus })],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
