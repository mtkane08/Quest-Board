import type { Pool } from 'pg';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../lib/logger.js';
import type { Logger } from '../lib/logger.js';
import { createPool } from './client.js';
import { SEED_QUESTS } from './seeds/quests.js';
import { AGE_GATED_GUILD_KEYS, GUILDS, REALMS, TAGS, TONES } from './seeds/taxonomy.js';

async function seedQuests(pool: Pool, logger: Logger): Promise<void> {
  let inserted = 0;
  for (const seed of SEED_QUESTS) {
    const existing = await pool.query('SELECT 1 FROM quest_versions WHERE title = $1', [seed.title]);
    if ((existing.rowCount ?? 0) > 0) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const questResult = await client.query<{ id: string }>(
        `INSERT INTO quests (owner_type, owner_id) VALUES ('system', NULL) RETURNING id`,
      );
      const quest = questResult.rows[0];
      if (!quest) throw new Error('Quest creation returned no row.');

      const primaryPlace = seed.places.find((p) => p.role === 'primary');

      const versionResult = await client.query<{ id: string }>(
        `INSERT INTO quest_versions (
           quest_id, status, title, plain_summary, narrated_description,
           guild_key, tags, origin_type, trust_badges, overall_tier, factor_scores,
           audience, duration_min_minutes, duration_max_minutes, cost_min_cents, cost_max_cents,
           travel_mode, physical_intensity, mental_intensity, risk_rating,
           accessibility_profile, age_restrictions, structure_type, objectives,
           completion_methods, required_equipment, safety_notes, feasibility_confidence,
           last_verification_at, publication_scope, primary_location
         ) VALUES (
           $1, 'published', $2, $3, $4,
           $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15,
           $16, $17, $18, $19,
           $20, $21, $22, $23,
           $24, $25, $26, $27,
           $28, 'public',
           ${primaryPlace ? 'ST_SetSRID(ST_MakePoint($29, $30), 4326)::geography' : 'NULL'}
         ) RETURNING id`,
        [
          quest.id, seed.title, seed.plainSummary, seed.narratedDescription,
          seed.guildKey, seed.tags, seed.originType, seed.trustBadges, seed.overallTier,
          JSON.stringify(seed.factorScores),
          seed.audience, seed.durationMinMinutes, seed.durationMaxMinutes, seed.costMinCents, seed.costMaxCents,
          seed.travelMode, seed.physicalIntensity, seed.mentalIntensity, seed.riskRating,
          JSON.stringify(seed.accessibilityProfile), JSON.stringify(seed.ageRestrictions),
          seed.structureType, seed.objectives,
          seed.completionMethods, seed.requiredEquipment, seed.safetyNotes, seed.feasibilityConfidence,
          seed.lastVerificationAt,
          ...(primaryPlace ? [primaryPlace.lng, primaryPlace.lat] : []),
        ],
      );
      const version = versionResult.rows[0];
      if (!version) throw new Error('Quest version creation returned no row.');

      await client.query('UPDATE quests SET current_version_id = $1 WHERE id = $2', [version.id, quest.id]);

      for (const [index, place] of seed.places.entries()) {
        await client.query(
          `INSERT INTO quest_place_references (quest_version_id, role, sequence_order, place_name, location)
           VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
          [version.id, place.role, index, place.placeName, place.lng, place.lat],
        );
      }

      await client.query('COMMIT');
      inserted += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  logger.info('seeded quests', { inserted, skipped: SEED_QUESTS.length - inserted });
}

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const pool = createPool(env);

  for (const realm of REALMS) {
    await pool.query(
      `INSERT INTO taxonomy_nodes (kind, stable_key, display_name)
       VALUES ('realm', $1, $2)
       ON CONFLICT (stable_key) DO NOTHING`,
      [realm.toLowerCase().replace(/[^a-z0-9]+/g, '_'), realm],
    );
  }

  for (const guild of GUILDS) {
    const safetyMetadata = AGE_GATED_GUILD_KEYS.has(guild.key)
      ? { requires_age_gate: true, requires_classification: true }
      : {};
    await pool.query(
      `INSERT INTO taxonomy_nodes (kind, stable_key, display_name, plain_subtitle, safety_metadata)
       VALUES ('guild', $1, $2, $3, $4)
       ON CONFLICT (stable_key) DO NOTHING`,
      [guild.key, guild.displayName, guild.plainSubtitle, JSON.stringify(safetyMetadata)],
    );
  }

  for (const tag of TAGS) {
    await pool.query(
      `INSERT INTO tags (key, label, category) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [tag.key, tag.key, tag.category],
    );
  }

  for (const tone of TONES) {
    await pool.query(
      `INSERT INTO tones (key, label) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [tone.key, tone.label],
    );
  }

  await pool.query(
    `INSERT INTO feature_flags (key, description, is_enabled) VALUES
       ('ai_quest_forge_enabled', 'Master switch for AI quest generation (stubbed until an AI provider is configured, ADR-006)', FALSE),
       ('fog_of_war_enabled', 'Opt-in exploration overlay (Release 1.1, Section 20)', FALSE)
     ON CONFLICT (key) DO NOTHING`,
  );

  await seedQuests(pool, logger);

  logger.info('seed complete', {
    realms: REALMS.length,
    guilds: GUILDS.length,
    tags: TAGS.length,
    tones: TONES.length,
  });
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
