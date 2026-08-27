-- Gate 7 Exploration — opt-in, foreground-only fog-of-war sessions.
-- See docs/gate-1/03-data-model.md batch 14, spec Section 20.
-- RegionProgress is deliberately NOT a table — same "derive, don't store"
-- pattern as Level/Rank/Streak (Gate 5): region progress is computed by
-- aggregating map_tile_discoveries on read, so there's nothing to keep in
-- sync. Real town/city/county names aren't resolved (that needs a
-- configured Places/geocoding provider); tiles are a coarse lat/lng grid
-- used as a region proxy — see modules/exploration/tiles.ts.

CREATE TABLE exploration_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id),
  mode           VARCHAR(20) NOT NULL DEFAULT 'foreground' CHECK (mode = 'foreground'),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  -- Last-known ping, used only to evaluate isImpossibleTravel on the next
  -- ping — not a location history; overwritten in place, never appended.
  last_lat       DOUBLE PRECISION,
  last_lng       DOUBLE PRECISION,
  last_ping_at   TIMESTAMPTZ
);

CREATE INDEX idx_exploration_sessions_user ON exploration_sessions(user_id);

CREATE TABLE map_tile_discoveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  session_id    UUID REFERENCES exploration_sessions(id),
  tile_id       VARCHAR(50) NOT NULL,
  travel_mode   VARCHAR(20) NOT NULL CHECK (travel_mode IN ('walk', 'cycle', 'drive', 'quest_completion_bonus')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tile_id)
);

CREATE INDEX idx_map_tile_discoveries_user ON map_tile_discoveries(user_id);

-- Section 20: "Detect impossible travel, GPS spoof patterns... cautiously."
-- Flagged pings are logged for later human review, never auto-punitive —
-- there is no column here that revokes anything; see modules/exploration/
-- routes.ts and tiles.ts's isImpossibleTravel for how this is used.
CREATE TABLE suspicious_movement_flags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  session_id    UUID REFERENCES exploration_sessions(id),
  detail        JSONB NOT NULL,
  flagged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
