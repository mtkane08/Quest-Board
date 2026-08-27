import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';

/**
 * Section 41: "MVP console implements essential moderation, reports, quest
 * suspension, verification, and audit functions first." This is that
 * read-only surface — a queue listing, a reports listing, and audit
 * search — deliberately with no admin *web UI* built on top of it yet
 * (see docs/gate-6/00-community-safety-report.md for why that's scoped
 * out of this gate).
 */
export function adminRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/moderation/queue', requirePermission(pool, 'view', 'moderation-queue', 'any'), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT mc.id AS case_id, mc.status, mc.opened_at, qv.title, qv.status AS quest_status
         FROM moderation_cases mc JOIN quest_versions qv ON qv.id = mc.target_id
         WHERE mc.status = 'open' ORDER BY mc.opened_at`,
      );
      res.json({ cases: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/reports', requirePermission(pool, 'view', 'report', 'any'), async (req, res, next) => {
    try {
      const status = z.enum(['open', 'resolved']).optional().parse(req.query.status);
      const result = await pool.query(
        status
          ? `SELECT id, target_type, target_id, category, severity, status, created_at FROM reports WHERE status = $1 ORDER BY created_at DESC`
          : `SELECT id, target_type, target_id, category, severity, status, created_at FROM reports ORDER BY created_at DESC`,
        status ? [status] : [],
      );
      res.json({ reports: result.rows });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.post('/reports/:id/resolve', requirePermission(pool, 'moderate', 'report', 'any'), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const result = await pool.query(`UPDATE reports SET status = 'resolved' WHERE id = $1 AND status = 'open'`, [id]);
      if (result.rowCount === 0) {
        next(Errors.notFound('Open report'));
        return;
      }
      res.status(204).end();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.get('/audit', requirePermission(pool, 'view', 'audit-log', 'any'), async (req, res, next) => {
    try {
      const query = z
        .object({ entityType: z.string().optional(), entityId: z.string().uuid().optional(), limit: z.coerce.number().max(200).optional() })
        .parse(req.query);
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (query.entityType) {
        params.push(query.entityType);
        conditions.push(`entity_type = $${params.length}`);
      }
      if (query.entityId) {
        params.push(query.entityId);
        conditions.push(`entity_id = $${params.length}`);
      }
      params.push(query.limit ?? 100);
      const sql = `SELECT id, actor_id, action, entity_type, entity_id, reason_code, created_at FROM audit_events
        ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
        ORDER BY created_at DESC LIMIT $${params.length}`;
      const result = await pool.query(sql, params);
      res.json({ events: result.rows });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  return router;
}
