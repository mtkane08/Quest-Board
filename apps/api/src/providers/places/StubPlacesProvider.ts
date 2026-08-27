import { GooglePlacesProvider } from './GooglePlacesProvider.js';
import type {
  GeocodeResult,
  NearbySearchParams,
  PlaceDetails,
  PlacesProvider,
} from './PlacesProvider.js';

/**
 * Used whenever GOOGLE_PLACES_SERVER_API_KEY is absent (local dev, CI,
 * Gate 2). Returns an empty result set rather than throwing, so discovery
 * endpoints can exercise their "provider degraded" state (QB-280, Section
 * 42) instead of crashing when no key is configured.
 */
export class StubPlacesProvider implements PlacesProvider {
  readonly isConfigured = false;

  async nearbySearch(_params: NearbySearchParams): Promise<PlaceDetails[]> {
    return [];
  }

  async getPlaceDetails(_googlePlaceId: string): Promise<PlaceDetails | null> {
    return null;
  }

  async geocode(_query: string): Promise<GeocodeResult | null> {
    return null;
  }
}

export function createPlacesProvider(serverApiKey: string | undefined): PlacesProvider {
  if (!serverApiKey) return new StubPlacesProvider();
  return new GooglePlacesProvider({ serverApiKey });
}
