-- Gate 6 Community Safety — ratings.
-- See docs/gate-1/03-data-model.md batch 10, spec Section 23. One rating
-- per attempt (you rate the experience you actually had), denormalized
-- quest_id for the aggregate query without a join through quest_attempts.

CREATE TABLE ratings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id        UUID NOT NULL UNIQUE REFERENCES quest_attempts(id),
  quest_id          UUID NOT NULL REFERENCES quests(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  enjoyment         SMALLINT NOT NULL CHECK (enjoyment BETWEEN 1 AND 5),
  accuracy          SMALLINT NOT NULL CHECK (accuracy BETWEEN 1 AND 5),
  tier_accuracy     SMALLINT NOT NULL CHECK (tier_accuracy BETWEEN 1 AND 5),
  would_recommend   SMALLINT NOT NULL CHECK (would_recommend BETWEEN 1 AND 5),
  review_text       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_quest ON ratings(quest_id);
