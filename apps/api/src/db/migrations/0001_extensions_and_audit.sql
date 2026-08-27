-- Gate 2 Foundation — extensions, audit trail, idempotency, feature flags.
-- See docs/gate-1/03-data-model.md batch 1 and ADR-011/ADR-012.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Every module writes here on every authorization-relevant state
-- transition (spec Section 24: "all state transitions require ...
-- timestamps, actor IDs, reason codes, and audit events").
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(100) NOT NULL,
  entity_id     UUID,
  reason_code   VARCHAR(100),
  before_state  JSONB,
  after_state   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);

-- ADR-011: idempotency keys required on reward/evidence/invitation/state
-- transition mutations. One row per (key, endpoint) pair; a replayed key
-- returns the stored response instead of re-executing the mutation.
CREATE TABLE idempotency_keys (
  key               VARCHAR(255) NOT NULL,
  endpoint          VARCHAR(255) NOT NULL,
  response_status   INTEGER NOT NULL,
  response_body     JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key, endpoint)
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Section 36: taxonomy/config editable without a deploy. Flags are read
-- through apps/api/src/lib/featureFlags.ts.
CREATE TABLE feature_flags (
  key           VARCHAR(100) PRIMARY KEY,
  description   TEXT,
  is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_rule  JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
