/**
 * Section 20 (fog of war): "Walking and cycling reveal detailed tiles.
 * Driving reveals the traveled route narrowly, not entire surroundings.
 * Completing a quest reveals a larger nearby area." All three rules are
 * pure functions over a simple lat/lng grid — no real place/region names
 * are resolved here (that needs a configured Places/geocoding provider,
 * which this environment doesn't have — see the Gate 7 report). A "tile"
 * is a coarse ~1km grid cell, good enough for the exploration-game
 * mechanic even without knowing what town it's actually in.
 */
export type TravelMode = 'walk' | 'cycle' | 'drive';

const TILE_PRECISION = 2; // ~1.1km latitude steps at the equator

export function quantizeToTile(lat: number, lng: number): string {
  return `${lat.toFixed(TILE_PRECISION)}_${lng.toFixed(TILE_PRECISION)}`;
}

function tileStep(): number {
  return 1 / 10 ** TILE_PRECISION;
}

/** All tiles within `radiusInTiles` grid steps of the center point, inclusive. */
function tileGrid(centerLat: number, centerLng: number, radiusInTiles: number): string[] {
  const step = tileStep();
  const tiles: string[] = [];
  for (let dLat = -radiusInTiles; dLat <= radiusInTiles; dLat += 1) {
    for (let dLng = -radiusInTiles; dLng <= radiusInTiles; dLng += 1) {
      tiles.push(quantizeToTile(centerLat + dLat * step, centerLng + dLng * step));
    }
  }
  return tiles;
}

export function tilesRevealedByTravel(lat: number, lng: number, mode: TravelMode): string[] {
  if (mode === 'drive') {
    // "Narrowly, not entire surroundings" — just the tile actually driven through.
    return [quantizeToTile(lat, lng)];
  }
  // Walking/cycling: a modest surrounding area, not just the exact point.
  return tileGrid(lat, lng, 1);
}

export const QUEST_COMPLETION_BONUS_RADIUS_TILES = 2;

export function tilesRevealedByQuestCompletion(lat: number, lng: number): string[] {
  return tileGrid(lat, lng, QUEST_COMPLETION_BONUS_RADIUS_TILES);
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Section 20: "Detect impossible travel, GPS spoof patterns, and repeat
 * farming cautiously. Do not penalize users merely for GPS drift, mobility
 * limitations, transit use, or accessibility accommodations." This flags
 * for review — nothing in this codebase revokes a reward or blocks a
 * session based on this signal alone; see the exploration routes for how
 * it's used (logged, not punitive).
 */
export function isImpossibleTravel(
  prev: { lat: number; lng: number; atIso: string },
  next: { lat: number; lng: number; atIso: string },
  maxPlausibleSpeedKmh = 200,
): boolean {
  const elapsedHours = (new Date(next.atIso).getTime() - new Date(prev.atIso).getTime()) / (1000 * 60 * 60);
  if (elapsedHours <= 0) return false;
  const distanceKm = haversineDistanceKm(prev.lat, prev.lng, next.lat, next.lng);
  return distanceKm / elapsedHours > maxPlausibleSpeedKmh;
}
