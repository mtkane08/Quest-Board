-- Gate 4 Forge/Feasibility — persisted evaluation results.
-- See docs/gate-1/03-data-model.md batch 6, ADR-009.

CREATE TABLE verification_checks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_version_id  UUID NOT NULL REFERENCES quest_versions(id) ON DELETE CASCADE,
  check_type        VARCHAR(100) NOT NULL,
  result            VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'warning', 'blocker')),
  detail            TEXT,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by        VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (checked_by IN ('system', 'human'))
);

CREATE INDEX idx_verification_checks_version ON verification_checks(quest_version_id);

CREATE TABLE feasibility_assessments (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_version_id            UUID NOT NULL REFERENCES quest_versions(id) ON DELETE CASCADE,
  overall_confidence          VARCHAR(20) NOT NULL CHECK (overall_confidence IN ('high', 'medium', 'low', 'critical_unknown')),
  blockers                    TEXT[] NOT NULL DEFAULT '{}',
  warnings                    TEXT[] NOT NULL DEFAULT '{}',
  unknowns                    TEXT[] NOT NULL DEFAULT '{}',
  recommended_publication_scope VARCHAR(30) NOT NULL,
  assessed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessment_source           VARCHAR(10) NOT NULL DEFAULT 'system' CHECK (assessment_source IN ('ai', 'system', 'human'))
);

CREATE INDEX idx_feasibility_assessments_version ON feasibility_assessments(quest_version_id);
