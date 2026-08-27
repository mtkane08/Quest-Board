-- Gate 6 Community Safety — reports, safety incidents, appeals.
-- See docs/gate-1/03-data-model.md batch 10, spec Sections 24-25.
-- `reporter_user_id` is nullable: reporting a safety problem should not
-- require an account, mirroring the same reasoning as QB-001's guest
-- AI-generation allowance — safety reporting is deliberately not gated
-- behind identity.

CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id  UUID REFERENCES users(id),
  target_type       VARCHAR(30) NOT NULL DEFAULT 'quest_version',
  target_id         UUID NOT NULL,
  category          VARCHAR(40) NOT NULL CHECK (category IN (
    'closure', 'inaccessibility', 'unsafe_conditions', 'bad_directions', 'trespass_risk',
    'injury_emergency', 'harassment', 'fraudulent_rewards', 'inappropriate_child_content',
    'incorrect_restrictions'
  )),
  severity          VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  note              TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Section 25: "High-severity reports can temporarily suppress a quest
-- pending review... preserve evidence... log moderator actions... support
-- appeals." One row per incident opened by a high/critical report.
CREATE TABLE safety_incidents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id             UUID NOT NULL REFERENCES reports(id),
  severity              VARCHAR(20) NOT NULL,
  suppression_applied   BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at           TIMESTAMPTZ
);

CREATE TABLE appeals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderation_case_id    UUID NOT NULL REFERENCES moderation_cases(id),
  appellant_user_id     UUID NOT NULL REFERENCES users(id),
  reason_text           TEXT,
  state                 VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'upheld', 'denied')),
  decided_by            UUID REFERENCES users(id),
  decided_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appeals_case ON appeals(moderation_case_id);

-- quest_versions.status (migration 0005) already allows 'flagged'/
-- 'suspended'/'archived' in its original CHECK constraint — those states
-- were reserved from the start even though Gate 4's minimal loop never
-- reached them. moderation_cases.status (migration 0008) did NOT reserve
-- a 'suspended' outcome, so it needs to be widened here. `IF EXISTS` and an
-- explicit re-declared name make this safe to run even if Postgres's
-- auto-generated constraint name ever differs from the assumed
-- `<table>_<column>_check` convention — worst case it adds a redundant,
-- harmless second CHECK rather than failing.
ALTER TABLE moderation_cases DROP CONSTRAINT IF EXISTS moderation_cases_status_check;
ALTER TABLE moderation_cases ADD CONSTRAINT moderation_cases_status_check CHECK (status IN (
  'open', 'approved', 'changes_requested', 'suspended'
));
