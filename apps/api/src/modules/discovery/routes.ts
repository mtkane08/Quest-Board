import type { Request } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { Errors } from '../../lib/errors.js';
import { isAdultContentEligible } from '../identity/ageEligibility.js';
import type { PlacesProvider } from '../../providers/places/PlacesProvider.js';
import { listQuestCards } from '../quest-catalog/repository.js';

/**
 * Section 12's hard-constraint ordering puts age/legality before
 * relevance. Eligibility is always computed server-side from the
 * session's own attested birth date — there is no client-supplied
 * "show me adult content" flag anywhere in `discoveryQuerySchema` to
 * accidentally trust instead.
 */
async function resolveIncludeAdultContent(pool: Pool, req: Request): Promise<boolean> {
  if (!req.session.userId) return false;
  const result = await pool.query<{ date_of_birth: string | null }>(
    `SELECT date_of_birth FROM age_attestations WHERE user_id = $1`,
    [req.session.userId],
  );
  const dob = result.rows[0]?.date_of_birth ?? null;
  return isAdultContentEligible(dob, new Date().toISOString());
}

export const discoveryQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().positive().max(200_000).optional(),
  guild: z.string().optional(),
  tag: z.string().optional(),
  maxDurationMinutes: z.coerce.number().positive().optional(),
  maxCostCents: z.coerce.number().nonnegative().optional(),
  // z.coerce.boolean() would turn the literal string "false" into `true`
  // (JS Boolean("false") is truthy) — a real bug this schema had until a
  // client sending ?wheelchairAccessible=false (rather than omitting the
  // param) silently filtered out every quest without confirmed/reported
  // wheelchair access. Parse the string explicitly instead.
  wheelchairAccessible: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  tier: z.enum(['novice', 'adventurer', 'heroic', 'legendary', 'mythic']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().positive().max(50).optional(),
});

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const decoded = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
  return Number.isFinite(decoded) && decoded >= 0 ? decoded : 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

/**
 * Section 8/45: the map and the accessible list must return identical
 * filtering/ranking — this route module shares one query builder
 * (`listQuestCards`) between `/map` and `/list` for exactly that reason,
 * rather than two independently-maintained query paths that could drift.
 */
export function discoveryRoutes(pool: Pool, placesProvider: PlacesProvider): Router {
  const router = Router();

  router.get('/list', async (req, res, next) => {
    try {
      const query = discoveryQuerySchema.parse(req.query);
      const offset = decodeCursor(query.cursor);
      const includeAdultContent = await resolveIncludeAdultContent(pool, req);
      const { cards, nextOffset } = await listQuestCards(pool, {
        lat: query.lat,
        lng: query.lng,
        radiusMeters: query.radiusMeters,
        guildKey: query.guild,
        tag: query.tag,
        maxDurationMinutes: query.maxDurationMinutes,
        maxCostCents: query.maxCostCents,
        wheelchairAccessible: query.wheelchairAccessible,
        tier: query.tier,
        limit: query.limit,
        offset,
        includeAdultContent,
      });
      res.json({
        results: cards,
        nextCursor: nextOffset != null ? encodeCursor(nextOffset) : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  // Same filters/ranking as /list; excludes quests with no coordinates
  // (can't drop a pin without a location) — everything /map can show,
  // /list can also show, but not vice versa (Hearth/at-home quests are
  // list-only, per spec Section 16's "Hearth is a first-class mode").
  router.get('/map', async (req, res, next) => {
    try {
      const query = discoveryQuerySchema.parse(req.query);
      const offset = decodeCursor(query.cursor);
      const includeAdultContent = await resolveIncludeAdultContent(pool, req);
      const { cards, nextOffset } = await listQuestCards(pool, {
        lat: query.lat,
        lng: query.lng,
        radiusMeters: query.radiusMeters,
        guildKey: query.guild,
        tag: query.tag,
        maxDurationMinutes: query.maxDurationMinutes,
        maxCostCents: query.maxCostCents,
        wheelchairAccessible: query.wheelchairAccessible,
        tier: query.tier,
        limit: query.limit,
        offset,
        includeAdultContent,
      });
      const pins = cards.filter((c) => c.primaryLocation !== null);
      res.json({
        results: pins,
        nextCursor: nextOffset != null ? encodeCursor(nextOffset) : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(Errors.validation(err.flatten()));
        return;
      }
      next(err);
    }
  });

  // Manual-location fallback (Section 42): typed city/ZIP/area search.
  router.get('/geocode', async (req, res, next) => {
    try {
      const { query } = z.object({ query: z.string().min(1) }).parse(req.query);
      if (!placesProvider.isConfigured) {
        res.status(200).json({
          result: null,
          degraded: true,
          message: 'Location search is unavailable right now — enter coordinates directly, or browse without a location filter.',
        });
        return;
      }
      const result = await placesProvider.geocode(query);
      res.json({ result, degraded: false });
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
