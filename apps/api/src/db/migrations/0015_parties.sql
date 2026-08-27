-- Gate 6 Community Safety — parties by invitation.
-- See docs/gate-1/03-data-model.md batch 9, spec Section 21. Deliberately
-- excludes TemporaryLocationShare (needs an active-attempt concept to
-- expire against meaningfully — reasonable follow-up, not core to
-- "parties by invitation" itself) and Collection (no product requirement
-- in this gate's scope exercises it).

CREATE TABLE parties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id      UUID REFERENCES quests(id),
  visibility    VARCHAR(20) NOT NULL DEFAULT 'private',
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE party_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id    UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  role        VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_id, user_id)
);

CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id        UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  invite_code     VARCHAR(30) NOT NULL UNIQUE,
  created_by      UUID NOT NULL REFERENCES users(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  used_by_user_id UUID REFERENCES users(id),
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_code ON invitations(invite_code);
