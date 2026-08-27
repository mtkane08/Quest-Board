-- Gate 3 Discovery — Places provider cache and provenance.
-- See docs/gate-1/03-data-model.md batch 4, ADR-005.
-- Every field cached from Google Places carries retrieval/expiry so the
-- adapter (apps/api/src/providers/places/) can enforce a TTL once the
-- Gate 0 licensing questions (docs/gate-0/04-provider-licensing-questions.md)
-- are answered — this table exists now so that enforcement has somewhere
-- to live, not because the terms have been confirmed.

CREATE TABLE provider_snapshots (
  google_place_id   VARCHAR(255) PRIMARY KEY,
  provider          VARCHAR(30) NOT NULL DEFAULT 'google_places',
  raw_fields        JSONB NOT NULL,
  attribution_text  TEXT,
  retrieved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_provider_snapshots_expires ON provider_snapshots(expires_at);

-- Generic per-field provenance record (spec Section 15: "every factual
-- field should record provider/source ID, retrieval time, last
-- verification, confidence, conflicts, and whether it is sourced, creator
-- asserted, community reported, or AI inferred").
CREATE TABLE source_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID NOT NULL,
  field_name    VARCHAR(100) NOT NULL,
  source_type   VARCHAR(30) NOT NULL CHECK (
    source_type IN ('provider', 'creator_asserted', 'community_reported', 'ai_inferred')
  ),
  source_ref    TEXT,
  confidence    VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (
    confidence IN ('high', 'medium', 'low', 'critical_unknown', 'unknown')
  ),
  retrieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_records_entity ON source_records(entity_type, entity_id);
