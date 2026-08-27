-- Gate 2 Foundation — taxonomy, seeded and editable without a deploy.
-- See docs/gate-1/03-data-model.md batch 3, spec Section 8.

CREATE TABLE taxonomy_nodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind            VARCHAR(20) NOT NULL CHECK (kind IN ('realm', 'guild', 'subcategory')),
  parent_id       UUID REFERENCES taxonomy_nodes(id),
  stable_key      VARCHAR(100) UNIQUE NOT NULL,
  display_name    VARCHAR(150) NOT NULL,
  plain_subtitle  VARCHAR(255),
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  exclusions      TEXT[] NOT NULL DEFAULT '{}',
  safety_metadata JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_taxonomy_nodes_kind ON taxonomy_nodes(kind);
CREATE INDEX idx_taxonomy_nodes_parent ON taxonomy_nodes(parent_id);

CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  label       VARCHAR(150) NOT NULL,
  category    VARCHAR(50) NOT NULL
);

CREATE TABLE themes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           VARCHAR(50) UNIQUE NOT NULL,
  label         VARCHAR(100) NOT NULL,
  is_custom     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tones (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key                VARCHAR(50) UNIQUE NOT NULL,
  label              VARCHAR(100) NOT NULL,
  is_custom          BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_state   VARCHAR(20) NOT NULL DEFAULT 'approved'
);
