import type {
  GeocodeResult,
  NearbySearchParams,
  PlaceDetails,
  PlacesProvider,
} from './PlacesProvider.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — placeholder pending the Gate 0
// licensing review (docs/gate-0/04-provider-licensing-questions.md); tighten
// or loosen once Google's actual caching terms are confirmed.

interface GooglePlacesConfig {
  serverApiKey: string;
}

/**
 * Real Google Places calls. Not exercised in Gate 2 CI (no key is
 * configured there) — StubPlacesProvider is what the Foundation vertical
 * slice actually runs against. This exists so the adapter boundary from
 * ADR-005 is real code, not just a promise.
 */
export class GooglePlacesProvider implements PlacesProvider {
  readonly isConfigured = true;
  private readonly apiKey: string;

  constructor(config: GooglePlacesConfig) {
    this.apiKey = config.serverApiKey;
  }

  async nearbySearch(params: NearbySearchParams): Promise<PlaceDetails[]> {
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${params.lat},${params.lng}`);
    url.searchParams.set('radius', String(params.radiusMeters));
    if (params.category) url.searchParams.set('type', params.category);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places nearbySearch failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      results: Array<{
        place_id: string;
        name: string;
        vicinity?: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    const now = Date.now();
    return body.results.map((r) => ({
      googlePlaceId: r.place_id,
      name: r.name,
      address: r.vicinity,
      location: r.geometry.location,
      retrievedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CACHE_TTL_MS).toISOString(),
      source: 'google_places' as const,
    }));
  }

  async getPlaceDetails(googlePlaceId: string): Promise<PlaceDetails | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', googlePlaceId);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places getPlaceDetails failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      result?: {
        place_id: string;
        name: string;
        formatted_address?: string;
        geometry: { location: { lat: number; lng: number } };
      };
    };
    if (!body.result) return null;

    const now = Date.now();
    return {
      googlePlaceId: body.result.place_id,
      name: body.result.name,
      address: body.result.formatted_address,
      location: body.result.geometry.location,
      retrievedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CACHE_TTL_MS).toISOString(),
      source: 'google_places' as const,
    };
  }

  async geocode(query: string): Promise<GeocodeResult | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Geocoding failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    const first = body.results[0];
    if (!first) return null;

    return {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      formattedAddress: first.formatted_address,
    };
  }
}
