-- Gate 5 Attempts — quest start/progress/completion.
-- See docs/gate-1/03-data-model.md batch 7, docs/gate-1/06-state-machines.md
-- (attempt state machine). Attempts require an account (Section 6: "account
-- required to ... earn durable rewards") — guest attempts are out of scope
-- for Gate 5, see the Gate 5 report's known limitations.

CREATE TABLE quest_attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_version_id  UUID NOT NULL REFERENCES quest_versions(id),
  quest_id          UUID NOT NULL REFERENCES quests(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  state             VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (state IN (
    'saved', 'planned', 'active', 'paused',
    'completed', 'partially_completed', 'abandoned', 'expired', 'disputed'
  )),
  started_at        TIMESTAMPTZ,
  paused_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quest_attempts_user ON quest_attempts(user_id);
CREATE INDEX idx_quest_attempts_quest ON quest_attempts(quest_id);

CREATE TABLE attempt_objectives (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id      UUID NOT NULL REFERENCES quest_attempts(id) ON DELETE CASCADE,
  sequence_order  INTEGER NOT NULL,
  text            TEXT NOT NULL,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_attempt_objectives_attempt ON attempt_objectives(attempt_id);

CREATE TABLE evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id      UUID NOT NULL REFERENCES quest_attempts(id) ON DELETE CASCADE,
  objective_id    UUID REFERENCES attempt_objectives(id),
  type            VARCHAR(20) NOT NULL CHECK (type IN (
    'honor_system', 'gps', 'photo', 'video', 'answer', 'host_approval', 'party_confirmation', 'external'
  )),
  note            TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_attempt ON evidence(attempt_id);

CREATE TABLE completion_decisions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id    UUID NOT NULL REFERENCES quest_attempts(id) ON DELETE CASCADE,
  decided_by    VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (decided_by IN ('system', 'host', 'party', 'moderator')),
  decision      VARCHAR(20) NOT NULL,
  reason_code   VARCHAR(100),
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
