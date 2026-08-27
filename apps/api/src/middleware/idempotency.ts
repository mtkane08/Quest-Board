import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

/**
 * ADR-011: idempotency keys on mutations where a retry could duplicate a
 * reward, evidence record, invitation, or state transition — the
 * `idempotency_keys` table has existed since Gate 2's foundation migration
 * but nothing used it until now (Gate 7 hardening, motivated directly by
 * Section 30's offline-sync requirement: a queued evidence/completion
 * request retried after reconnecting must not double-count).
 *
 * The header is opt-in, not required: a client that sends no
 * `Idempotency-Key` gets today's behavior unchanged (this preserves every
 * earlier gate's test suite and API contract). A client that does send one
 * gets replay protection — the second identical request returns the first
 * request's actual response instead of re-executing the handler.
 */
export function idempotent(pool: Pool, endpointName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.header('Idempotency-Key');
    if (!key) {
      next();
      return;
    }

    try {
      const existing = await pool.query<{ response_status: number; response_body: unknown }>(
        `SELECT response_status, response_body FROM idempotency_keys WHERE key = $1 AND endpoint = $2 AND expires_at > NOW()`,
        [key, endpointName],
      );
      const cached = existing.rows[0];
      if (cached) {
        res.status(cached.response_status).json(cached.response_body);
        return;
      }
    } catch (err) {
      next(err);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      pool
        .query(
          `INSERT INTO idempotency_keys (key, endpoint, response_status, response_body, expires_at)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
           ON CONFLICT (key, endpoint) DO NOTHING`,
          [key, endpointName, res.statusCode, JSON.stringify(body)],
        )
        .catch(() => {
          // Best-effort: a failure to persist the replay record must never
          // block the response the caller is actually waiting on.
        });
      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}
