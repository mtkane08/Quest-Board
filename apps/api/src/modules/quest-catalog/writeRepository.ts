import type { Pool, PoolClient } from 'pg';
import type { calculateTier, FactorScores } from '../tiering/calculateTier.js';
import type { FeasibilityInput } from '../feasibility/types.js';

export interface DraftPlaceInput {
  role: 'primary' | 'stop';
  placeName: string;
  lat: number;
  lng: number;
}

export interface DraftQuestInput {
  title: string;
  plainSummary: string;
  narratedDescription: string | null;
  guildKey: string | null;
  tags: string[];
  factorScores: FactorScores;
  audience: string;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  costMinCents: number | null;
  costMaxCents: number | null;
  travelMode: string | null;
  physicalIntensity: number | null;
  mentalIntensity: number | null;
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  accessibilityProfile: Record<string, string>;
  ageRestrictions: { min_age: number | null; adult_content: boolean; alcohol: boolean; gambling: boolean };
  structureType: string;
  objectives: string[];
  completionMethods: string[];
  requiredEquipment: string[];
  safetyNotes: string | null;
  places: DraftPlaceInput[];
  aiAssisted: boolean;
}

export interface QuestOwnership {
  questId: string;
  currentVersionId: string;
  ownerId: string | null;
  ownerType: string;
  status: string;
}

export async function getQuestOwnership(pool: Pool, questId: string): Promise<QuestOwnership | null> {
  const result = await pool.query<{
    id: string;
    current_version_id: string;
    owner_id: string | null;
    owner_type: string;
    status: string;
  }>(
    `SELECT q.id, q.current_version_id, q.owner_id, q.owner_type, qv.status
     FROM quests q JOIN quest_versions qv ON qv.id = q.current_version_id
     WHERE q.id = $1`,
    [questId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    questId: row.id,
    currentVersionId: row.current_version_id,
    ownerId: row.owner_id,
    ownerType: row.owner_type,
    status: row.status,
  };
}

const EDITABLE_STATUSES = new Set(['draft', 'ai_generated', 'needs_correction']);

export function isEditable(status: string): boolean {
  return EDITABLE_STATUSES.has(status);
}

function versionColumns(
  input: DraftQuestInput,
  tier: ReturnType<typeof calculateTier>,
): { columns: string[]; values: unknown[] } {
  return {
    columns: [
      'title', 'plain_summary', 'narrated_description', 'guild_key', 'tags',
      'origin_type', 'overall_tier', 'factor_scores', 'audience',
      'duration_min_minutes', 'duration_max_minutes', 'cost_min_cents', 'cost_max_cents',
      'travel_mode', 'physical_intensity', 'mental_intensity', 'risk_rating',
      'accessibility_profile', 'age_restrictions', 'structure_type', 'objectives',
      'completion_methods', 'required_equipment', 'safety_notes',
    ],
    values: [
      input.title, input.plainSummary, input.narratedDescription, input.guildKey, input.tags,
      input.aiAssisted ? 'ai_suggested' : 'community', tier.tier, JSON.stringify(input.factorScores), input.audience,
      input.durationMinMinutes, input.durationMaxMinutes, input.costMinCents, input.costMaxCents,
      input.travelMode, input.physicalIntensity, input.mentalIntensity, input.riskRating,
      JSON.stringify(input.accessibilityProfile), JSON.stringify(input.ageRestrictions), input.structureType, input.objectives,
      input.completionMethods, input.requiredEquipment, input.safetyNotes,
    ],
  };
}

async function replacePlaceReferences(client: PoolClient, versionId: string, places: DraftPlaceInput[]) {
  await client.query('DELETE FROM quest_place_references WHERE quest_version_id = $1', [versionId]);
  for (const [index, place] of places.entries()) {
    await client.query(
      `INSERT INTO quest_place_references (quest_version_id, role, sequence_order, place_name, location)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
      [versionId, place.role, index, place.placeName, place.lng, place.lat],
    );
  }
  const primary = places.find((p) => p.role === 'primary');
  await client.query(
    primary
      ? `UPDATE quest_versions SET primary_location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography WHERE id = $1`
      : `UPDATE quest_versions SET primary_location = NULL WHERE id = $1`,
    primary ? [versionId, primary.lng, primary.lat] : [versionId],
  );
}

export async function createQuestDraft(
  pool: Pool,
  ownerId: string,
  input: DraftQuestInput,
  tier: ReturnType<typeof calculateTier>,
): Promise<{ questId: string; versionId: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const questResult = await client.query<{ id: string }>(
      `INSERT INTO quests (owner_type, owner_id) VALUES ('user', $1) RETURNING id`,
      [ownerId],
    );
    const quest = questResult.rows[0];
    if (!quest) throw new Error('Quest creation returned no row.');

    const { columns, values } = versionColumns(input, tier);
    const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
    const versionResult = await client.query<{ id: string }>(
      `INSERT INTO quest_versions (quest_id, ${columns.join(', ')})
       VALUES ($1, ${placeholders}) RETURNING id`,
      [quest.id, ...values],
    );
    const version = versionResult.rows[0];
    if (!version) throw new Error('Quest version creation returned no row.');

    await client.query('UPDATE quests SET current_version_id = $1 WHERE id = $2', [version.id, quest.id]);
    await replacePlaceReferences(client, version.id, input.places);

    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_state)
       VALUES ($1, 'create_draft', 'quest', $2, $3)`,
      [ownerId, quest.id, JSON.stringify({ title: input.title })],
    );

    await client.query('COMMIT');
    return { questId: quest.id, versionId: version.id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateQuestDraft(
  pool: Pool,
  versionId: string,
  input: DraftQuestInput,
  tier: ReturnType<typeof calculateTier>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { columns, values } = versionColumns(input, tier);
    const setClauses = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    await client.query(`UPDATE quest_versions SET ${setClauses} WHERE id = $1`, [versionId, ...values]);
    await replacePlaceReferences(client, versionId, input.places);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function buildFeasibilityInput(pool: Pool, versionId: string): Promise<FeasibilityInput> {
  const result = await pool.query(
    `SELECT qv.title, qv.plain_summary, qv.objectives, qv.completion_methods, qv.travel_mode,
            qv.risk_rating, qv.safety_notes, qv.accessibility_profile, qv.age_restrictions,
            qv.duration_min_minutes, qv.duration_max_minutes, qv.cost_min_cents, qv.cost_max_cents,
            (qv.primary_location IS NOT NULL) AS has_primary_place,
            COALESCE((tn.safety_metadata->>'requires_age_gate')::boolean, FALSE) AS guild_requires_age_gate
     FROM quest_versions qv
     LEFT JOIN taxonomy_nodes tn ON tn.stable_key = qv.guild_key
     WHERE qv.id = $1`,
    [versionId],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Quest version ${versionId} not found.`);
  return {
    title: row.title,
    plainSummary: row.plain_summary,
    objectives: row.objectives ?? [],
    completionMethods: row.completion_methods ?? [],
    travelMode: row.travel_mode,
    hasPrimaryPlace: row.has_primary_place,
    riskRating: row.risk_rating,
    safetyNotes: row.safety_notes,
    accessibilityProfile: row.accessibility_profile,
    ageRestrictions: row.age_restrictions,
    guildRequiresAgeGate: row.guild_requires_age_gate,
    durationMinMinutes: row.duration_min_minutes,
    durationMaxMinutes: row.duration_max_minutes,
    costMinCents: row.cost_min_cents,
    costMaxCents: row.cost_max_cents,
  };
}
