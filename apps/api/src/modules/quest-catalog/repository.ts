import type { Pool } from 'pg';
import { getAggregateRatingForQuest } from '../ratings/repository.js';
import type { QuestCard, QuestDetail } from './types.js';

export interface DiscoveryFilters {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  guildKey?: string;
  tag?: string;
  maxDurationMinutes?: number;
  maxCostCents?: number;
  wheelchairAccessible?: boolean;
  tier?: string;
  /**
   * Section 12's ranking order runs hard constraints — including age
   * legality — before anything else. Gate 3 doesn't yet have per-user age
   * attestation wired into discovery (that needs the session/auth
   * integration this endpoint doesn't have yet), so the safe default is to
   * exclude adult content unless a caller explicitly opts in. This is a
   * conservative stand-in, not the real jurisdiction-aware gate from
   * DL-002 — do not remove this default without that gate existing first.
   */
  includeAdultContent?: boolean;
  limit?: number;
  offset?: number;
}

const CARD_SELECT = `
  SELECT
    q.id AS quest_id,
    qv.id AS version_id,
    qv.title,
    qv.plain_summary,
    qv.guild_key,
    tn.display_name AS guild_display_name,
    tn.plain_subtitle AS guild_plain_subtitle,
    qv.tags,
    qv.overall_tier,
    qv.duration_min_minutes,
    qv.duration_max_minutes,
    qv.cost_min_cents,
    qv.cost_max_cents,
    qv.origin_type,
    qv.trust_badges,
    qv.feasibility_confidence,
    qv.accessibility_profile,
    qv.age_restrictions,
    primary_ref.place_name AS primary_place_name,
    ST_Y(primary_ref.location::geometry) AS primary_lat,
    ST_X(primary_ref.location::geometry) AS primary_lng
`;

const CARD_FROM = `
  FROM quest_versions qv
  JOIN quests q ON q.id = qv.quest_id
  LEFT JOIN taxonomy_nodes tn ON tn.stable_key = qv.guild_key
  LEFT JOIN quest_place_references primary_ref
    ON primary_ref.quest_version_id = qv.id AND primary_ref.role = 'primary'
`;

export function buildFilterClauses(filters: DiscoveryFilters, params: unknown[]): string[] {
  const clauses: string[] = [`qv.status = 'published'`];

  if (!filters.includeAdultContent) {
    clauses.push(`(qv.age_restrictions->>'adult_content')::boolean IS NOT TRUE`);
  }

  if (filters.guildKey) {
    params.push(filters.guildKey);
    clauses.push(`qv.guild_key = $${params.length}`);
  }

  if (filters.tag) {
    params.push(filters.tag);
    clauses.push(`$${params.length} = ANY(qv.tags)`);
  }

  if (filters.maxDurationMinutes !== undefined) {
    params.push(filters.maxDurationMinutes);
    clauses.push(`(qv.duration_min_minutes IS NULL OR qv.duration_min_minutes <= $${params.length})`);
  }

  if (filters.maxCostCents !== undefined) {
    params.push(filters.maxCostCents);
    clauses.push(`(qv.cost_min_cents IS NULL OR qv.cost_min_cents <= $${params.length})`);
  }

  if (filters.tier) {
    params.push(filters.tier);
    clauses.push(`qv.overall_tier = $${params.length}`);
  }

  // ADR-010: `unknown` never satisfies an "accessible" filter — this is a
  // direct guard against Gate 0 risk R-11 (accessibility unknown silently
  // treated as accessible).
  if (filters.wheelchairAccessible) {
    clauses.push(`qv.accessibility_profile->>'wheelchair' IN ('confirmed', 'reported')`);
  }

  if (filters.lat !== undefined && filters.lng !== undefined) {
    const radius = filters.radiusMeters ?? 50_000;
    params.push(filters.lng, filters.lat, radius);
    const lngIdx = params.length - 2;
    const latIdx = params.length - 1;
    const radiusIdx = params.length;
    clauses.push(
      `(qv.primary_location IS NULL OR ST_DWithin(qv.primary_location, ST_MakePoint($${lngIdx}, $${latIdx})::geography, $${radiusIdx}))`,
    );
  }

  return clauses;
}

function mapCardRow(row: Record<string, unknown>): QuestCard {
  return {
    questId: row.quest_id as string,
    versionId: row.version_id as string,
    title: row.title as string,
    plainSummary: row.plain_summary as string,
    guildKey: (row.guild_key as string | null) ?? null,
    guildDisplayName: (row.guild_display_name as string | null) ?? null,
    guildPlainSubtitle: (row.guild_plain_subtitle as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    overallTier: row.overall_tier as QuestCard['overallTier'],
    durationMinMinutes: (row.duration_min_minutes as number | null) ?? null,
    durationMaxMinutes: (row.duration_max_minutes as number | null) ?? null,
    costMinCents: (row.cost_min_cents as number | null) ?? null,
    costMaxCents: (row.cost_max_cents as number | null) ?? null,
    distanceMeters: row.distance_meters != null ? Number(row.distance_meters) : null,
    originType: row.origin_type as string,
    trustBadges: (row.trust_badges as string[]) ?? [],
    feasibilityConfidence: row.feasibility_confidence as QuestCard['feasibilityConfidence'],
    accessibilityHighlights: (row.accessibility_profile as QuestCard['accessibilityHighlights']) ?? {},
    ageRestrictions: row.age_restrictions as QuestCard['ageRestrictions'],
    primaryPlaceName: (row.primary_place_name as string | null) ?? null,
    primaryLocation:
      row.primary_lat != null && row.primary_lng != null
        ? { lat: Number(row.primary_lat), lng: Number(row.primary_lng) }
        : null,
  };
}

export async function listQuestCards(
  pool: Pool,
  filters: DiscoveryFilters,
): Promise<{ cards: QuestCard[]; nextOffset: number | null }> {
  const params: unknown[] = [];
  const clauses = buildFilterClauses(filters, params);
  const limit = Math.min(filters.limit ?? 20, 50);
  const offset = filters.offset ?? 0;

  let distanceSelect = 'NULL::float AS distance_meters';
  let orderBy = 'qv.created_at DESC';
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.push(filters.lng, filters.lat);
    const lngIdx = params.length - 1;
    const latIdx = params.length;
    distanceSelect = `ST_Distance(qv.primary_location, ST_MakePoint($${lngIdx}, $${latIdx})::geography) AS distance_meters`;
    orderBy = 'distance_meters ASC NULLS LAST';
  }

  params.push(limit + 1, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    ${CARD_SELECT}, ${distanceSelect}
    ${CARD_FROM}
    WHERE ${clauses.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const result = await pool.query(sql, params);
  const rows = result.rows.slice(0, limit);
  const hasMore = result.rows.length > limit;

  return {
    cards: rows.map(mapCardRow),
    nextOffset: hasMore ? offset + limit : null,
  };
}

export async function getQuestDetail(pool: Pool, questId: string): Promise<QuestDetail | null> {
  const cardResult = await pool.query(
    `${CARD_SELECT}, NULL::float AS distance_meters,
      qv.narrated_description, qv.structure_type, qv.objectives, qv.completion_methods,
      qv.required_equipment, qv.safety_notes, qv.risk_rating, qv.physical_intensity,
      qv.mental_intensity, qv.travel_mode, qv.accessibility_profile AS full_accessibility_profile,
      qv.factor_scores, qv.publication_scope, qv.last_verification_at
     ${CARD_FROM}
     WHERE q.id = $1 AND qv.status = 'published'`,
    [questId],
  );
  const row = cardResult.rows[0];
  if (!row) return null;

  const placesResult = await pool.query(
    `SELECT role, place_name, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
     FROM quest_place_references WHERE quest_version_id = $1 ORDER BY sequence_order`,
    [row.version_id],
  );

  const aggregateRating = await getAggregateRatingForQuest(pool, questId);

  return {
    ...mapCardRow(row),
    narratedDescription: row.narrated_description ?? null,
    structureType: row.structure_type,
    objectives: row.objectives ?? [],
    completionMethods: row.completion_methods ?? [],
    requiredEquipment: row.required_equipment ?? [],
    safetyNotes: row.safety_notes ?? null,
    riskRating: row.risk_rating,
    physicalIntensity: row.physical_intensity ?? null,
    mentalIntensity: row.mental_intensity ?? null,
    travelMode: row.travel_mode ?? null,
    accessibilityProfile: row.full_accessibility_profile,
    factorScores: row.factor_scores ?? {},
    publicationScope: row.publication_scope,
    lastVerificationAt: row.last_verification_at ? new Date(row.last_verification_at).toISOString() : null,
    places: placesResult.rows.map((p) => ({
      role: p.role,
      placeName: p.place_name,
      location: p.lat != null && p.lng != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null,
    })),
    aggregateRating,
  };
}
