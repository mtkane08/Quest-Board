-- Gate 4 Forge — minimal moderation-submission loop, not the full admin
-- console (that's Gate 6, per docs/gate-1/02-system-context-and-modules.md's
-- vertical-slice mapping). This exists only so a submitted quest from an
-- untrusted creator (QB-162) has somewhere to go and a way to leave.

ALTER TABLE users ADD COLUMN creator_trust BOOLEAN NOT NULL DEFAULT FALSE;
-- No self-service path to TRUE exists yet — set manually by an operator
-- (e.g. `UPDATE users SET creator_trust = true WHERE id = ...`) until the
-- real CreatorProfile/ReputationEvent trust-tier system is built (Gate 6,
-- docs/gate-1/03-data-model.md batch 9).

CREATE TABLE moderation_cases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type       VARCHAR(30) NOT NULL DEFAULT 'quest_version',
  target_id         UUID NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'changes_requested')),
  opened_by         UUID REFERENCES users(id),
  decided_by        UUID REFERENCES users(id),
  reason_code       VARCHAR(100),
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at        TIMESTAMPTZ
);

CREATE INDEX idx_moderation_cases_status ON moderation_cases(status);
CREATE INDEX idx_moderation_cases_target ON moderation_cases(target_type, target_id);
