import type { Pool } from 'pg';
import { isImpossibleTravel, quantizeToTile, tilesRevealedByQuestCompletion, tilesRevealedByTravel, type TravelMode } from './tiles.js';

export interface SessionOwnership {
  userId: string;
  endedAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastPingAt: string | null;
}

export async function startSession(pool: Pool, userId: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO exploration_sessions (user_id) VALUES ($1) RETURNING id`,
    [userId],
  );
  return result.rows[0]!.id;
}

export async function getSessionOwnership(pool: Pool, sessionId: string): Promise<SessionOwnership | null> {
  const result = await pool.query(
    `SELECT user_id, ended_at, last_lat, last_lng, last_ping_at FROM exploration_sessions WHERE id = $1`,
    [sessionId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userId: row.user_id, endedAt: row.ended_at, lastLat: row.last_lat, lastLng: row.last_lng, lastPingAt: row.last_ping_at };
}

export async function stopSession(pool: Pool, sessionId: string): Promise<void> {
  await pool.query(`UPDATE exploration_sessions SET ended_at = NOW() WHERE id = $1`, [sessionId]);
}

async function insertTiles(pool: Pool, userId: string, sessionId: string | null, tiles: string[], travelMode: string): Promise<string[]> {
  const newlyRevealed: string[] = [];
  for (const tileId of tiles) {
    const result = await pool.query(
      `INSERT INTO map_tile_discoveries (user_id, session_id, tile_id, travel_mode)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, tile_id) DO NOTHING RETURNING tile_id`,
      [userId, sessionId, tileId, travelMode],
    );
    if ((result.rowCount ?? 0) > 0) newlyRevealed.push(tileId);
  }
  return newlyRevealed;
}

export async function recordPing(
  pool: Pool,
  sessionId: string,
  userId: string,
  lat: number,
  lng: number,
  travelMode: TravelMode,
): Promise<{ newlyRevealedTiles: string[]; suspicious: boolean }> {
  const session = await getSessionOwnership(pool, sessionId);
  const nowIso = new Date().toISOString();

  let suspicious = false;
  if (session?.lastLat != null && session.lastLng != null && session.lastPingAt) {
    suspicious = isImpossibleTravel(
      { lat: session.lastLat, lng: session.lastLng, atIso: session.lastPingAt },
      { lat, lng, atIso: nowIso },
    );
    if (suspicious) {
      await pool.query(
        `INSERT INTO suspicious_movement_flags (user_id, session_id, detail) VALUES ($1, $2, $3)`,
        [userId, sessionId, JSON.stringify({ from: { lat: session.lastLat, lng: session.lastLng }, to: { lat, lng } })],
      );
    }
  }

  const tiles = tilesRevealedByTravel(lat, lng, travelMode);
  const newlyRevealedTiles = await insertTiles(pool, userId, sessionId, tiles, travelMode);

  await pool.query(
    `UPDATE exploration_sessions SET last_lat = $2, last_lng = $3, last_ping_at = NOW() WHERE id = $1`,
    [sessionId, lat, lng],
  );

  return { newlyRevealedTiles, suspicious };
}

/** Called from the attempts module on quest completion — a larger-area reveal, no session required. */
export async function revealTilesForQuestCompletion(pool: Pool, userId: string, lat: number, lng: number): Promise<string[]> {
  const tiles = tilesRevealedByQuestCompletion(lat, lng);
  return insertTiles(pool, userId, null, tiles, 'quest_completion_bonus');
}

export async function getRegionProgress(pool: Pool, userId: string) {
  const result = await pool.query<{ tile_id: string }>(`SELECT tile_id FROM map_tile_discoveries WHERE user_id = $1`, [userId]);
  const coarseRegions = new Map<string, number>();
  for (const row of result.rows) {
    const [latStr, lngStr] = row.tile_id.split('_');
    const coarseKey = `${Number(latStr).toFixed(1)}_${Number(lngStr).toFixed(1)}`;
    coarseRegions.set(coarseKey, (coarseRegions.get(coarseKey) ?? 0) + 1);
  }
  return {
    totalTilesDiscovered: result.rows.length,
    // "Region" here is a coarse grid cell standing in for a county, since
    // no real place-name data is available (see the module doc comment).
    regions: Array.from(coarseRegions.entries()).map(([regionId, tileCount]) => ({ regionId, tileCount })),
  };
}

/** QB-121: deleting fog history must never delete unrelated achievements — badges/XP live in separate tables untouched by this. */
export async function deleteExplorationHistory(pool: Pool, userId: string): Promise<void> {
  await pool.query(`DELETE FROM map_tile_discoveries WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM suspicious_movement_flags WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM exploration_sessions WHERE user_id = $1`, [userId]);
}

export { quantizeToTile };
