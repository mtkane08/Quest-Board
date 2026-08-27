import { ensureUrlScheme } from './normalizeUrl';

/**
 * Server-side API base URL. The web app is a BFF client (Section 36) — it
 * calls the API server-to-server during rendering here, and will proxy
 * browser-originated calls through its own routes once auth/session
 * wiring between the two apps is built out past Gate 2.
 */
const API_BASE_URL = ensureUrlScheme(process.env.API_BASE_URL ?? 'http://localhost:3001');

export interface HealthResponse {
  status: 'ok' | 'error';
  checks: Record<string, 'ok' | 'degraded' | 'error'>;
}

export interface Guild {
  stable_key: string;
  display_name: string;
  plain_subtitle: string | null;
  safety_metadata: Record<string, unknown>;
}

async function safeFetch<T>(path: string): Promise<T | { error: true; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) {
      return { error: true, message: `API returned ${res.status}` };
    }
    return (await res.json()) as T;
  } catch (err) {
    return { error: true, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function getHealth() {
  return safeFetch<HealthResponse>('/health');
}

export function getGuilds() {
  return safeFetch<{ guilds: Guild[] }>('/api/v1/taxonomy/guilds');
}

export type AccessibilityState = 'confirmed' | 'reported' | 'partially' | 'not_accessible' | 'unknown';

export interface QuestCard {
  questId: string;
  versionId: string;
  title: string;
  plainSummary: string;
  guildKey: string | null;
  guildDisplayName: string | null;
  guildPlainSubtitle: string | null;
  tags: string[];
  overallTier: 'novice' | 'adventurer' | 'heroic' | 'legendary' | 'mythic';
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  costMinCents: number | null;
  costMaxCents: number | null;
  distanceMeters: number | null;
  originType: string;
  trustBadges: string[];
  feasibilityConfidence: 'high' | 'medium' | 'low' | 'critical_unknown';
  accessibilityHighlights: Partial<Record<string, AccessibilityState>>;
  ageRestrictions: { min_age: number | null; adult_content: boolean; alcohol: boolean; gambling: boolean };
  primaryPlaceName: string | null;
  primaryLocation: { lat: number; lng: number } | null;
}

export interface QuestDetail extends QuestCard {
  narratedDescription: string | null;
  structureType: string;
  objectives: string[];
  completionMethods: string[];
  requiredEquipment: string[];
  safetyNotes: string | null;
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  physicalIntensity: number | null;
  mentalIntensity: number | null;
  travelMode: string | null;
  accessibilityProfile: Record<string, AccessibilityState>;
  publicationScope: string;
  lastVerificationAt: string | null;
  places: Array<{ role: string; placeName: string | null; location: { lat: number; lng: number } | null }>;
  aggregateRating: {
    responseCount: number;
    isDisplayable: boolean;
    averages: { enjoyment: number; accuracy: number; tierAccuracy: number; wouldRecommend: number } | null;
  };
}

export interface DiscoveryQuery {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  guild?: string;
  tag?: string;
  maxDurationMinutes?: number;
  maxCostCents?: number;
  wheelchairAccessible?: boolean;
  tier?: string;
}

function toQueryString(query: DiscoveryQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getDiscoveryList(query: DiscoveryQuery) {
  return safeFetch<{ results: QuestCard[]; nextCursor: string | null }>(
    `/api/v1/discovery/list${toQueryString(query)}`,
  );
}

export function getDiscoveryMap(query: DiscoveryQuery) {
  return safeFetch<{ results: QuestCard[]; nextCursor: string | null }>(
    `/api/v1/discovery/map${toQueryString(query)}`,
  );
}

export function getQuest(id: string) {
  return safeFetch<{ quest: QuestDetail }>(`/api/v1/quests/${id}`);
}

export function isApiError<T>(value: T | { error: true; message: string }): value is { error: true; message: string } {
  return typeof value === 'object' && value !== null && 'error' in value && value.error === true;
}
