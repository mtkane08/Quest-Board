import type { Pool } from 'pg';

export interface GenerationJobRow {
  id: string;
  jobType: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'timed_out';
  input: unknown;
  output: unknown;
  errorMessage: string | null;
}

export async function createGenerationJob(
  pool: Pool,
  jobType: string,
  requesterUserId: string | null,
  input: unknown,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO generation_jobs (job_type, requester_user_id, status, input)
     VALUES ($1, $2, 'queued', $3) RETURNING id`,
    [jobType, requesterUserId, JSON.stringify(input)],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Generation job creation returned no row.');
  return row.id;
}

export async function completeGenerationJob(pool: Pool, jobId: string, output: unknown): Promise<void> {
  await pool.query(
    `UPDATE generation_jobs SET status = 'succeeded', output = $2, completed_at = NOW() WHERE id = $1`,
    [jobId, JSON.stringify(output)],
  );
}

export async function failGenerationJob(pool: Pool, jobId: string, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE generation_jobs SET status = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1`,
    [jobId, errorMessage],
  );
}

export async function getGenerationJob(pool: Pool, jobId: string): Promise<GenerationJobRow | null> {
  const result = await pool.query(
    `SELECT id, job_type, status, input, output, error_message FROM generation_jobs WHERE id = $1`,
    [jobId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    input: row.input,
    output: row.output,
    errorMessage: row.error_message,
  };
}
