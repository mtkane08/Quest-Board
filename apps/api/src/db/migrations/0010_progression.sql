-- Gate 5 Progression — XP ledger and badges.
-- See docs/gate-1/03-data-model.md batch 8. Level/Rank/SkillProgress are
-- deliberately NOT tables here — they're pure functions over this ledger
-- (apps/api/src/modules/progression/leveling.ts), so there is no mutable
-- "current level" value that could ever drift from the XP history that
-- justifies it. Streak is likewise derived from quest_attempts.completed_at,
-- not stored.

-- Append-only ledger, never UPDATEd/DELETEd in application code, so
-- anti-farming/anomaly review (Section 19) always has full history to
-- audit — a running counter would lose exactly the information needed to
-- catch abuse after the fact.
CREATE TABLE xp_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  quest_id      UUID NOT NULL REFERENCES quests(id),
  source_type   VARCHAR(30) NOT NULL CHECK (source_type IN ('attempt_completion', 'attempt_partial_completion')),
  source_ref    UUID NOT NULL REFERENCES quest_attempts(id),
  amount        INTEGER NOT NULL CHECK (amount >= 0),
  reward_version VARCHAR(50) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id);
CREATE INDEX idx_xp_events_user_quest ON xp_events(user_id, quest_id);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  badge_key   VARCHAR(100) NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_key)
);
