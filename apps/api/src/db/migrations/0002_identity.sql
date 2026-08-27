-- Gate 2 Foundation — identity and authorization.
-- See docs/gate-1/03-data-model.md batch 2, ADR-008 (role/permission model),
-- and docs/gate-0/06-decision-log.md DL-002 (age threshold — still open,
-- so date_of_birth is nullable and no age-gating logic ships yet beyond
-- storing the attestation).

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  username              VARCHAR(30) UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_guardian_managed   BOOLEAN NOT NULL DEFAULT FALSE,
  data_class            VARCHAR(50) NOT NULL DEFAULT 'account_data',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name      VARCHAR(100),
  adventurer_name   VARCHAR(100),
  bio               TEXT,
  avatar_url        TEXT,
  public_fields     JSONB NOT NULL DEFAULT '[]',
  privacy_settings  JSONB NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ADR-008: (action, entity, access) tuples grouped into named roles.
-- Section 6's 11 role types are represented as `role` values here; scope
-- narrows a grant to a household/organization/business once those modules
-- exist (Release 2 for org/business — see docs/gate-0/06-decision-log.md).
CREATE TABLE role_grants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(50) NOT NULL,
  scope_type    VARCHAR(20) NOT NULL DEFAULT 'global',
  scope_id      UUID,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by    UUID REFERENCES users(id),
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX idx_role_grants_user ON role_grants(user_id) WHERE revoked_at IS NULL;

CREATE TABLE consents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type  VARCHAR(50) NOT NULL,
  version       VARCHAR(20) NOT NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ
);

CREATE TABLE age_attestations (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth   DATE,
  attested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method          VARCHAR(30) NOT NULL DEFAULT 'self_attested',
  data_class      VARCHAR(50) NOT NULL DEFAULT 'account_data'
);

CREATE TABLE households (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE child_profiles (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id                  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  guardian_user_id              UUID NOT NULL REFERENCES users(id),
  display_name                  VARCHAR(100) NOT NULL,
  restricted_content_flags      JSONB NOT NULL DEFAULT '{"adult_content": false, "public_dm": false}',
  data_class                    VARCHAR(50) NOT NULL DEFAULT 'child_data',
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guardian_relationships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_profile_id  UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  verified_at       TIMESTAMPTZ,
  data_class        VARCHAR(50) NOT NULL DEFAULT 'child_data',
  UNIQUE (guardian_user_id, child_profile_id)
);
