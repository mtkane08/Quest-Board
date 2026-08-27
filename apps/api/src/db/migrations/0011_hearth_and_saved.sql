-- Gate 5 Hearth / saved quests.
-- See docs/gate-1/03-data-model.md batch 13 (Inventory) and batch 9's
-- SavedQuest — pulled forward from its data-model grouping with
-- Party/Invitation (Gate 6) because spec Section 47 explicitly lists
-- "saved quests" under Gate 5 ("Attempts and Hearth"), not Gate 6.
--
-- `inventory_items` is keyed directly to a user rather than through a
-- separate `Inventory` header row — a household-shared inventory (Section
-- 16 mentions this as a possibility) is a real future need, but nothing in
-- Gate 5's scope exercises sharing, so the extra join is deferred rather
-- than spectulatively built now.

CREATE TABLE inventory_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(50),
  quantity    VARCHAR(50),
  data_class  VARCHAR(50) NOT NULL DEFAULT 'home_inventory',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);

CREATE TABLE saved_quests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_id)
);
