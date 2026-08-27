-- Gate 3 Discovery — quest catalog read path.
-- See docs/gate-1/03-data-model.md batch 5, ADR-007 (versioned quests),
-- ADR-010 (no-boolean accessibility/confidence enums), docs/gate-1/
-- 06-state-machines.md (publication state machine).
--
-- This is deliberately the READ-path subset of the full quest data
-- contract (spec Section 10): objectives are a plain text[] for card/detail
-- display, not yet a relational child table, because per-objective attempt
-- progress (which is what would need real relational querying) doesn't
-- exist until Gate 5. Branch/Hint/Reward child tables and TierProfile
-- overrides are deferred to Gate 4 (Forge/feasibility), which is what
-- actually writes quest content instead of just seeding it.

CREATE TABLE quests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_version_id UUID,
  owner_type        VARCHAR(20) NOT NULL CHECK (owner_type IN ('system', 'user', 'business', 'organization')),
  owner_id          UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT owner_id_required_unless_system CHECK (
    (owner_type = 'system' AND owner_id IS NULL) OR
    (owner_type != 'system' AND owner_id IS NOT NULL)
  )
);

CREATE TABLE quest_versions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id                UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  version_number          INTEGER NOT NULL DEFAULT 1,
  status                  VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'feasibility_review', 'needs_correction', 'submitted',
    'approved', 'published', 'conditions_uncertain', 'temporarily_unavailable',
    'flagged', 'suspended', 'archived', 'superseded'
  )),
  superseded_by_version_id UUID REFERENCES quest_versions(id),

  title             VARCHAR(200) NOT NULL,
  plain_summary     VARCHAR(300) NOT NULL,
  narrated_description TEXT,
  selected_tone_key VARCHAR(50) REFERENCES tones(key),

  realm_key         VARCHAR(100) REFERENCES taxonomy_nodes(stable_key),
  guild_key         VARCHAR(100) REFERENCES taxonomy_nodes(stable_key),
  tags              TEXT[] NOT NULL DEFAULT '{}',

  origin_type       VARCHAR(30) NOT NULL DEFAULT 'quest_board_curated' CHECK (origin_type IN (
    'ai_suggested', 'community', 'creator_verified', 'business_verified', 'quest_board_curated'
  )),
  trust_badges      TEXT[] NOT NULL DEFAULT '{}',

  overall_tier      VARCHAR(20) NOT NULL CHECK (overall_tier IN (
    'novice', 'adventurer', 'heroic', 'legendary', 'mythic'
  )),
  factor_scores     JSONB NOT NULL DEFAULT '{}',

  audience          VARCHAR(30) NOT NULL DEFAULT 'any',
  group_size_min    INTEGER NOT NULL DEFAULT 1,
  group_size_max    INTEGER,

  duration_min_minutes INTEGER,
  duration_max_minutes INTEGER,
  cost_min_cents        INTEGER,
  cost_max_cents        INTEGER,
  travel_mode           VARCHAR(20) CHECK (travel_mode IN ('walk', 'cycle', 'drive', 'transit', 'any')),

  physical_intensity  SMALLINT CHECK (physical_intensity BETWEEN 1 AND 5),
  mental_intensity     SMALLINT CHECK (mental_intensity BETWEEN 1 AND 5),
  risk_rating          VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_rating IN ('low', 'moderate', 'high', 'severe')),

  -- ADR-010: explicit enum per accessibility category, `unknown` is a real
  -- member, never represented by a missing/null/boolean shortcut.
  accessibility_profile JSONB NOT NULL DEFAULT '{
    "wheelchair": "unknown", "low_walking": "unknown", "sensory_friendly": "unknown",
    "service_animal": "unknown", "restroom_access": "unknown"
  }',

  age_restrictions  JSONB NOT NULL DEFAULT '{"min_age": null, "adult_content": false, "alcohol": false, "gambling": false}',

  structure_type    VARCHAR(30) NOT NULL DEFAULT 'single_objective',
  objectives        TEXT[] NOT NULL DEFAULT '{}',
  completion_methods TEXT[] NOT NULL DEFAULT '{"honor_system"}',
  required_equipment TEXT[] NOT NULL DEFAULT '{}',

  safety_notes      TEXT,

  feasibility_confidence VARCHAR(20) NOT NULL DEFAULT 'critical_unknown' CHECK (feasibility_confidence IN (
    'high', 'medium', 'low', 'critical_unknown'
  )),
  last_verification_at TIMESTAMPTZ,

  publication_scope VARCHAR(30) NOT NULL DEFAULT 'private' CHECK (publication_scope IN (
    'private', 'shared_by_link', 'friends_only', 'group_only', 'unlisted', 'public', 'scheduled_public_event'
  )),

  -- Denormalized primary location for fast "nearby" queries (ADR-003); the
  -- authoritative per-stop data lives in quest_place_references below.
  primary_location  GEOGRAPHY(POINT, 4326),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quests
  ADD CONSTRAINT fk_quests_current_version
  FOREIGN KEY (current_version_id) REFERENCES quest_versions(id);

CREATE INDEX idx_quest_versions_quest ON quest_versions(quest_id);
CREATE INDEX idx_quest_versions_status ON quest_versions(status);
CREATE INDEX idx_quest_versions_guild ON quest_versions(guild_key);
CREATE INDEX idx_quest_versions_location ON quest_versions USING GIST(primary_location);

CREATE TABLE quest_place_references (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_version_id  UUID NOT NULL REFERENCES quest_versions(id) ON DELETE CASCADE,
  google_place_id   VARCHAR(255) REFERENCES provider_snapshots(google_place_id),
  role              VARCHAR(20) NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'stop', 'checkpoint')),
  sequence_order    INTEGER NOT NULL DEFAULT 0,
  -- Denormalized display fields so seed/community quests don't require a
  -- live Google Places call to render a name/location (ADR-005's adapter
  -- is still the only path for anything claiming to be Google-sourced).
  place_name        VARCHAR(200),
  location          GEOGRAPHY(POINT, 4326)
);

CREATE INDEX idx_quest_place_refs_version ON quest_place_references(quest_version_id);
