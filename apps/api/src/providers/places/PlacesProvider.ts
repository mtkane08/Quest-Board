/**
 * ADR-005: Google Maps Platform/Places is the sole place-data source, but
 * every caller goes through this adapter interface — never the Google SDK
 * directly — so licensing-driven cache/TTL rules live in one place and a
 * provider outage degrades gracefully (Section 42) instead of breaking
 * every module that touches place data.
 */
export interface PlaceDetails {
  googlePlaceId: string;
  name: string;
  address?: string;
  location: { lat: number; lng: number };
  retrievedAt: string;
  /** Licensing terms for caching Places data are not yet reviewed — see
   * docs/gate-0/04-provider-licensing-questions.md. Until that's resolved,
   * `expiresAt` defaults conservatively short. */
  expiresAt: string;
  source: 'google_places';
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  category?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Backs the manual-location fallback (Section 42: "if location is denied,
 * support manual city/ZIP/area search") — turns free-text into
 * coordinates. Returns `null` rather than throwing when nothing matches, so
 * callers can render a clean "no results for that location" state.
 */
export interface PlacesProvider {
  readonly isConfigured: boolean;
  nearbySearch(params: NearbySearchParams): Promise<PlaceDetails[]>;
  getPlaceDetails(googlePlaceId: string): Promise<PlaceDetails | null>;
  geocode(query: string): Promise<GeocodeResult | null>;
}
