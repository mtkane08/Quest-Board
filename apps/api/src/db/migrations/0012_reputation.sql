-- Gate 6 Community Safety — creator reputation ledger.
-- See docs/gate-1/03-data-model.md batch 9 (ReputationEvent),
-- apps/api/src/modules/reputation/trust.ts.
--
-- `users.creator_trust` (added Gate 4, migration 0008) was a NOT NULL
-- boolean defaulting FALSE, which cannot distinguish "no manual opinion —
-- defer to earned reputation" from "an admin explicitly revoked trust."
-- Making it nullable fixes that: NULL means no override, TRUE/FALSE are
-- real admin decisions either way. Nothing has used this column in a real
-- deployment yet (no environment has actually run these migrations against
-- production data), so backfilling existing FALSE values to NULL is a safe
-- one-time semantic correction, not a data-loss risk.

ALTER TABLE users ALTER COLUMN creator_trust DROP DEFAULT;
ALTER TABLE users ALTER COLUMN creator_trust DROP NOT NULL;
UPDATE users SET creator_trust = NULL WHERE creator_trust = FALSE;

CREATE TABLE reputation_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  event_type  VARCHAR(30) NOT NULL CHECK (event_type IN ('quest_approved', 'quest_rejected', 'report_upheld_against')),
  points      INTEGER NOT NULL,
  source_ref  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_user ON reputation_events(user_id);
