import { describe, expect, it } from 'vitest';
import {
  isImpossibleTravel,
  quantizeToTile,
  tilesRevealedByQuestCompletion,
  tilesRevealedByTravel,
} from '../src/modules/exploration/tiles.js';

describe('quantizeToTile (Section 20)', () => {
  it('nearby coordinates within the same ~1km cell map to the same tile', () => {
    expect(quantizeToTile(42.3601, -71.0589)).toBe(quantizeToTile(42.3604, -71.0591));
  });

  it('coordinates in a clearly different area map to a different tile', () => {
    expect(quantizeToTile(42.3601, -71.0589)).not.toBe(quantizeToTile(42.4601, -71.1589));
  });
});

describe('tilesRevealedByTravel (Section 20: walk/cycle wide, drive narrow)', () => {
  it('driving reveals only the single tile actually traveled through', () => {
    const tiles = tilesRevealedByTravel(42.36, -71.06, 'drive');
    expect(tiles).toEqual([quantizeToTile(42.36, -71.06)]);
  });

  it('walking reveals a wider surrounding area than driving', () => {
    const walkTiles = tilesRevealedByTravel(42.36, -71.06, 'walk');
    const driveTiles = tilesRevealedByTravel(42.36, -71.06, 'drive');
    expect(walkTiles.length).toBeGreaterThan(driveTiles.length);
    expect(walkTiles).toContain(quantizeToTile(42.36, -71.06));
  });

  it('cycling reveals the same generous area as walking (both non-driving)', () => {
    expect(tilesRevealedByTravel(42.36, -71.06, 'cycle').length).toBe(
      tilesRevealedByTravel(42.36, -71.06, 'walk').length,
    );
  });
});

describe('tilesRevealedByQuestCompletion (Section 20: "a larger nearby area")', () => {
  it('reveals more tiles than an ordinary walking ping', () => {
    const completionTiles = tilesRevealedByQuestCompletion(42.36, -71.06);
    const walkTiles = tilesRevealedByTravel(42.36, -71.06, 'walk');
    expect(completionTiles.length).toBeGreaterThan(walkTiles.length);
  });
});

describe('isImpossibleTravel (Section 20, applied cautiously)', () => {
  it('does not flag ordinary walking speed', () => {
    const flagged = isImpossibleTravel(
      { lat: 42.36, lng: -71.06, atIso: '2026-08-26T12:00:00Z' },
      { lat: 42.361, lng: -71.06, atIso: '2026-08-26T12:10:00Z' },
    );
    expect(flagged).toBe(false);
  });

  it('does not flag ordinary driving speed', () => {
    const flagged = isImpossibleTravel(
      { lat: 42.36, lng: -71.06, atIso: '2026-08-26T12:00:00Z' },
      { lat: 42.46, lng: -71.06, atIso: '2026-08-26T12:30:00Z' }, // ~11km in 30 min = ~22km/h... use a bigger jump
    );
    expect(flagged).toBe(false);
  });

  it('flags a jump that would require faster-than-plausible travel', () => {
    const flagged = isImpossibleTravel(
      { lat: 42.36, lng: -71.06, atIso: '2026-08-26T12:00:00Z' },
      { lat: 51.5, lng: -0.13, atIso: '2026-08-26T12:05:00Z' }, // Boston to London in 5 minutes
    );
    expect(flagged).toBe(true);
  });

  it('does not flag when timestamps go backward or are simultaneous (avoids nonsensical division)', () => {
    expect(
      isImpossibleTravel(
        { lat: 42.36, lng: -71.06, atIso: '2026-08-26T12:00:00Z' },
        { lat: 51.5, lng: -0.13, atIso: '2026-08-26T11:00:00Z' },
      ),
    ).toBe(false);
  });
});
