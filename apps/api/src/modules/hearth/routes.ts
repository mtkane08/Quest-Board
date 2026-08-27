import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { Errors } from '../../lib/errors.js';

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50).nullable().default(null),
  quantity: z.string().max(50).nullable().default(null),
});

/**
 * Section 16 (Hearth/typed inventory): "private by default, editable,
 * exportable, and deletable" (QB-081). No photo extraction here — that's
 * Release 1.1 per Section 35; this is the typed-entry path only.
 */
export function hearthRoutes(pool: Pool): Router {
  const router = Router();

  router.get('/inventory', requireAuth(), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, category, quantity, created_at FROM inventory_items WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.session.userId],
      );
      res.json({ items: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/inventory/export', requireAuth(), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT name, category, quantity, created_at FROM inventory_items WHERE user_id = $1 ORDER BY created_at`,
        [req.session.userId],
      );
      res.setHeader('Content-Disposition', 'attachment; filename="quest-board-inventory.json"');
      res.json({ exportedAt: new Date().toISOString(), items: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/inventory', requireAuth(), async (req, res, next) => {
    try {
      const input = itemSchema.parse(req.body);
      const result = await pool.query<{ id: string }>(
        `INSERT INTO inventory_items (user_id, name, category, quantity) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.session.userId, input.name, input.category, input.quantity],
      );
      res.status(201).json({ id: result.rows[0]?.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  router.patch('/inventory/:id', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const input = itemSchema.partial().parse(req.body);
      const result = await pool.query(
        `UPDATE inventory_items SET
           name = COALESCE($3, name), category = COALESCE($4, category), quantity = COALESCE($5, quantity)
         WHERE id = $1 AND user_id = $2`,
        [id, req.session.userId, input.name ?? null, input.category ?? null, input.quantity ?? null],
      );
      if (result.rowCount === 0) {
        next(Errors.notFound('Inventory item'));
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

  router.delete('/inventory/:id', requireAuth(), async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const result = await pool.query(`DELETE FROM inventory_items WHERE id = $1 AND user_id = $2`, [id, req.session.userId]);
      if (result.rowCount === 0) {
        next(Errors.notFound('Inventory item'));
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

  return router;
}
