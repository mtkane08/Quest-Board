import type { Pool } from 'pg';

export interface CreateReportInput {
  reporterUserId: string | null;
  targetType: string;
  targetId: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  note: string | null;
}

export interface CreateReportResult {
  reportId: string;
  suppressionApplied: boolean;
  moderationCaseId: string | null;
}

/**
 * Section 25: "High-severity reports can temporarily suppress a quest
 * pending review." Only a currently-`published` quest gets suppressed —
 * flagging a draft or already-suspended quest wouldn't mean anything, and
 * silently overwriting some other status would destroy information about
 * where it actually was.
 */
export async function createReport(pool: Pool, input: CreateReportInput): Promise<CreateReportResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportResult = await client.query<{ id: string }>(
      `INSERT INTO reports (reporter_user_id, target_type, target_id, category, severity, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.reporterUserId, input.targetType, input.targetId, input.category, input.severity, input.note],
    );
    const report = reportResult.rows[0];
    if (!report) throw new Error('Report creation returned no row.');

    let suppressionApplied = false;
    let moderationCaseId: string | null = null;

    const isHighSeverity = input.severity === 'high' || input.severity === 'critical';
    if (isHighSeverity && input.targetType === 'quest_version') {
      const questVersion = await client.query<{ status: string }>(
        `SELECT status FROM quest_versions WHERE id = $1`,
        [input.targetId],
      );
      if (questVersion.rows[0]?.status === 'published') {
        await client.query(`UPDATE quest_versions SET status = 'flagged' WHERE id = $1`, [input.targetId]);
        suppressionApplied = true;

        const caseResult = await client.query<{ id: string }>(
          `INSERT INTO moderation_cases (target_type, target_id, opened_by) VALUES ('quest_version', $1, $2) RETURNING id`,
          [input.targetId, input.reporterUserId],
        );
        moderationCaseId = caseResult.rows[0]?.id ?? null;
      }

      await client.query(
        `INSERT INTO safety_incidents (report_id, severity, suppression_applied) VALUES ($1, $2, $3)`,
        [report.id, input.severity, suppressionApplied],
      );
    }

    await client.query('COMMIT');
    return { reportId: report.id, suppressionApplied, moderationCaseId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
