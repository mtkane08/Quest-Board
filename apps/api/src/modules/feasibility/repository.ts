import type { Pool } from 'pg';
import type { FeasibilityAssessmentResult } from './types.js';

export async function persistFeasibilityResult(
  pool: Pool,
  versionId: string,
  result: FeasibilityAssessmentResult,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const check of result.checks) {
      await client.query(
        `INSERT INTO verification_checks (quest_version_id, check_type, result, detail)
         VALUES ($1, $2, $3, $4)`,
        [versionId, check.checkType, check.result, check.detail],
      );
    }

    await client.query(
      `INSERT INTO feasibility_assessments
         (quest_version_id, overall_confidence, blockers, warnings, unknowns, recommended_publication_scope)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [versionId, result.overallConfidence, result.blockers, result.warnings, result.unknowns, result.recommendedPublicationScope],
    );

    await client.query(
      `UPDATE quest_versions SET feasibility_confidence = $2, last_verification_at = NOW() WHERE id = $1`,
      [versionId, result.overallConfidence],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
