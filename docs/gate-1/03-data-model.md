# Gate 1 — Data Model and Migrations Plan

Entities grouped by module boundary (matches `02-system-context-and-modules.md`).
This is a logical model — exact column types/constraints are finalized as
migrations are written at Gate 2, per ADR-001 through ADR-012. All entities
follow the spec's blanket rule (Section 37): stable IDs (UUID), `created_at`/
`updated_at`, soft-deletion where appropriate, version/concurrency control,
audit provenance.

## Identity & Authorization

- **User** — id, email, username, password_hash, display_name, bio,
  avatar_url, date_of_birth (nullable — see DL-002), is_active,
  independent_or_guardian_managed, created_at.
- **Profile** — user_id, adventurer_name, public_fields (which of
  name/username/adventurer-name are public — Section 21), privacy_settings.
- **RoleGrant** — user_id, role (enum, Section 6's 11 types), scope_type
  (`global | household | organization | business`), scope_id (nullable),
  granted_at, granted_by, revoked_at.
- **Consent** — user_id, consent_type (ToS, privacy policy, marketing,
  location, camera, etc.), version, granted_at, revoked_at.
- **AgeAttestation** — user_id, attested_birth_year_range or exact DOB
  (per DL-002 outcome), attested_at, method (self, guardian-provided).
- **Household** — id, name, created_by.
- **GuardianRelationship** — guardian_user_id, child_profile_id, verified_at.
- **ChildProfile** — id, household_id, guardian_user_id, display_name,
  restricted_content_flags (always-on per QB-181), no independent login
  credentials of its own beyond guardian-mediated access.

## Taxonomy / Configuration / Feature Flags

- **TaxonomyNode** — id, kind (`realm | guild | subcategory`), parent_id,
  stable_key, display_name, plain_subtitle, aliases[], exclusions[],
  safety_metadata (jsonb: age-gate flag, requires-classification flag),
  is_active. Editable via admin UI without deploy (QB-020).
- **Tag** — id, key, label, category (mood/accessibility/logistics/etc.).
- **Theme** / **Tone** — id, key, label, description, is_custom,
  moderation_state (for user-submitted custom tones, Section 28).
- **FeatureFlag** — key, description, rollout_rule (jsonb), is_enabled.
- **GeographicReadiness** — region_id, density_score, verification_recency,
  external_coverage_score, community_supply_score, moderation_capacity_score,
  completion_feedback_score, seasonal_reliability_score, computed_at.
  Internal-only (Section 31) — never exposed raw to end users.

## Quest Catalog & Versioning

- **Quest** — id (stable identity), current_version_id, owner_type
  (`user | business | organization | system`), owner_id, created_at.
- **QuestVersion** — id, quest_id, version_number, status (publication state
  machine — see `06-state-machines.md`), superseded_by_version_id, title,
  plain_summary, narrated_description, selected_tone_id, realm_id, guild_id,
  subcategory_id, tags[], origin_type (`ai_suggested | community |
  creator_verified | business_verified | curated`), creator_identity_ref,
  trust_badges[], overall_tier, factor_scores (jsonb, the 9 factors from
  Section 11), audience/group_size, duration_range, cost_range,
  distance/travel_mode, physical/mental_intensity, accessibility_profile
  (jsonb using the enum types from ADR-010), age_restrictions,
  adult_content_flags, structure_type (one of Section 9's 16 types),
  objectives/stages/branches/bonuses/hints (jsonb or child tables — see
  below), completion_methods[], evidence_policy, reward_definition,
  required_equipment/reservations/permits, place_refs, route/checkpoints,
  operating_availability, weather/daylight_constraints, venue_rules,
  public_access_status, safety_notes, risk_rating, feasibility_confidence,
  last_verification_at, publication_scope, moderation_state,
  sponsorship_disclosure (nullable — no sponsorship in R1), localization
  fields, created_at.
- **Objective**, **Branch**, **Hint**, **Reward** — child tables of
  `QuestVersion` for structures that need real relational querying (e.g.,
  "has this user completed objective X") rather than opaque jsonb.
- **QuestPlaceReference** — quest_version_id, google_place_id (nullable for
  location-independent quests), role (`primary | stop | checkpoint`),
  sequence_order.
- **Route**, **Checkpoint** — for multi-stop/route quest structures
  (Section 17), each checkpoint linking to a `QuestPlaceReference` or raw
  coordinate.
- **TierProfile** — category-specific factor-weight overrides (Section 11),
  versioned and explainable per ADR requirement — id, applies_to_guild_id,
  weight_overrides (jsonb), version, rationale, effective_at.
- **FactorScore** — normalized per-quest-version factor breakdown, kept
  separate from the jsonb blob on `QuestVersion` for query/analytics
  convenience (e.g., "show all Novice-tier, low-cost quests").
- **Campaign**, **CampaignProgress** — groups of connected `Quest`s (Section
  9's "campaigns") and per-user/party progress through them.

## Places / Provider Cache

- **ProviderSnapshot** — google_place_id, provider (`google_places`),
  retrieved_at, expires_at, raw_fields (jsonb, only what's licensed to
  cache — see Gate 0 licensing questions), attribution_text.
  Deliberately *not* a permanent copy — governed by ADR-005's TTL
  enforcement.
- **SourceRecord** — generic provenance record: entity_type, entity_id,
  field_name, source_type (`provider | creator_asserted | community_reported
  | ai_inferred`), source_ref, retrieved_at, confidence.
- **FactualClaim** — quest_version_id or place_id, claim_text, citation_ref,
  is_historical_flavor (bool — distinguishes narrated flavor from a factual
  claim per Section 15).

## Generation / Orchestration (AI)

- **GenerationJob** — id, job_type (`quest_forge | conversational_turn |
  nearby_variant | inventory_extraction | translation`), requester_user_id,
  status (`queued | running | succeeded | failed | timed_out`), input_ref
  (jsonb, schema-validated), output_ref (jsonb, schema-validated),
  prompt_version, model_identifier, cost_estimate, started_at, completed_at.
  Backs the "job ID / resumable status" requirement (Section 38).
- **AiConversationLog** — session_id, user_id (nullable for guest), turns
  (jsonb array, redacted per retention policy), created_at, retention_class.

## Feasibility / Provenance

- **VerificationCheck** — quest_version_id, check_type (one of the 11-point
  list in Section 15), result (`pass | warning | blocker | unknown`),
  detail, checked_at, checked_by (`system | human`).
- **FeasibilityAssessment** — quest_version_id, overall_confidence
  (`high | medium | low | critical_unknown` — ADR-010), blockers[],
  warnings[], recommended_publication_scope, assessed_at, assessment_source
  (`ai | human`).

## Attempts / Completion / Evidence

- **QuestAttempt** — id, quest_version_id (pinned per ADR-007), user_id or
  party_id, state (attempt state machine — see `06-state-machines.md`),
  started_at, paused_at, completed_at, outcome
  (`completed | partially_completed | abandoned | expired | disputed`).
- **AttemptObjective** — attempt_id, objective_id, state, completed_at.
- **Evidence** — attempt_id, objective_id (nullable), type (`photo | video |
  gps | answer | host_approval | party_confirmation | external`), storage_ref
  (nullable if not media), submitted_at, review_state.
- **CompletionDecision** — attempt_id, decided_by (`system | host | party |
  moderator`), decision, reason_code, decided_at.

## Social / Parties

- **Party** — id, quest_attempt_id (nullable if pre-quest planning party),
  visibility, created_by.
- **PartyMember** — party_id, user_id, role (`host | member`), joined_at.
- **Invitation** — id, party_id or organization_id, invite_code, expires_at,
  used_by_user_id, used_at.
- **TemporaryLocationShare** — party_id, user_id, expires_at (hard cap tied
  to the active-quest window per Section 26), last_location (only while
  active, purged on expiry — see `08-privacy-retention-matrix.md`).
- **SavedQuest**, **Collection** — user-curated saved lists.
- **CreatorProfile**, **ReputationEvent** — creator trust-tier tracking
  feeding QB-162's "new creators require review until trusted."

## Progression / Rewards

- **XPEvent** — user_id, source_type (`attempt_completion | rating |
  contribution | ...`), source_ref, amount, created_at (append-only ledger,
  not a mutable counter, so anti-farming/anomaly checks in Section 19 can
  audit history).
- **Level**, **Rank** — derived/config-driven thresholds over cumulative XP.
- **SkillProgress** — user_id, mastery_track (Explorer/Culinarian/Scholar/
  Artisan/Steward — Section 19), progress_value.
- **Badge**, **Achievement**, **Streak** — standard progression primitives;
  `Streak` explicitly has no punitive reset-to-zero-with-penalty behavior
  (QB-111) — a broken streak just stops counting, no XP clawback.

## Moderation / Safety

- **Rating**, **Review** — attempt_id, ratee_type (`quest`), the 4 scores
  from Section 23, free-text review, aggregate-display gated by
  `min_response_threshold` (DL-006).
- **Report** — id, reporter_user_id, target_type/target_id, category
  (matches Section 25's list), severity, state.
- **Appeal** — report_id or moderation_case_id, appellant_user_id, state.
- **ModerationCase** — target_type/target_id, opened_by, state, resolution,
  resolved_at.
- **SafetyIncident** — report_id, severity, suppression_applied (bool),
  notified_active_users (bool), resolved_at.

## Organizations / Businesses (Release 2, schema reserved now per Section 5/35)

- **Organization**, **VenueClaim**, **Verification**, **Sponsorship** — kept
  as forward-compatible schema stubs only; no write paths/UI ship before the
  Release 2 gate (per Gate 0 resolution of C-1 and DL-004).

## Exploration (Release 1.1)

- **ExplorationSession** — user_id, mode (`foreground` only in 1.1),
  started_at, ended_at.
- **MapTileDiscovery** — session_id or user_id, tile_id, travel_mode
  (`walk | cycle | drive | quest_completion_bonus`), discovered_at.
- **RegionProgress** — user_id, region_type (`town/city | county`),
  region_id, percent_discovered.

## Inventory (Hearth)

- **Inventory**, **InventoryItem** — user_id or household_id, private by
  default, exportable/deletable (QB-081).
- **InventoryExtraction** — source_image_ref, detected_items (jsonb),
  confirmed (bool) — nothing is added to `InventoryItem` until confirmed.

## Notifications

- **NotificationPreference** — user_id, notification_type, enabled (default
  per Section 29 — nearby proactive alerts default `false`).
- **Notification** — user_id, type, payload, sent_at, read_at.

## Cross-cutting

- **AuditEvent** — actor_id, action, entity_type, entity_id, reason_code,
  before/after snapshot (jsonb), created_at. Written by every module on every
  state transition (ADR requirement from Section 24's "all state transitions
  require ... audit events").
- **IdempotencyKey** — key, endpoint, response_snapshot, created_at,
  expires_at (ADR-011).

## Migrations plan (Gate 2 execution order)

Grouped so each migration batch corresponds to a working vertical slice, not
alphabetical/dependency-only ordering:

1. **Extensions & foundation:** `uuid-ossp`/`pgcrypto`, PostGIS extension,
   `AuditEvent`, `IdempotencyKey`, `FeatureFlag`.
2. **Identity:** `User`, `Profile`, `RoleGrant`, `Consent`,
   `AgeAttestation`, `Household`, `GuardianRelationship`, `ChildProfile`.
3. **Taxonomy:** `TaxonomyNode`, `Tag`, `Theme`, `Tone`.
4. **Places cache:** `ProviderSnapshot`, `SourceRecord`.
5. **Quest catalog core:** `Quest`, `QuestVersion`, `Objective`, `Branch`,
   `Hint`, `Reward`, `QuestPlaceReference`, `TierProfile`, `FactorScore`.
6. **Feasibility:** `VerificationCheck`, `FeasibilityAssessment`,
   `FactualClaim`.
7. **Attempts:** `QuestAttempt`, `AttemptObjective`, `Evidence`,
   `CompletionDecision`.
8. **Progression:** `XPEvent`, `Level`, `Rank`, `SkillProgress`, `Badge`,
   `Achievement`, `Streak`.
9. **Social (invite-only):** `Party`, `PartyMember`, `Invitation`,
   `TemporaryLocationShare`, `SavedQuest`, `Collection`, `CreatorProfile`,
   `ReputationEvent`.
10. **Moderation:** `Rating`, `Review`, `Report`, `Appeal`,
    `ModerationCase`, `SafetyIncident`.
11. **Generation/AI:** `GenerationJob`, `AiConversationLog`.
12. **Notifications:** `NotificationPreference`, `Notification`.
13. **Hearth/Inventory:** `Inventory`, `InventoryItem`,
    `InventoryExtraction`.
14. **(1.1) Exploration:** `ExplorationSession`, `MapTileDiscovery`,
    `RegionProgress`, `GeographicReadiness`.
15. **(1.1) Routing:** `Route`, `Checkpoint`, `Campaign`,
    `CampaignProgress`.
16. **(Reserved, no write path yet) Business/Org:** `Organization`,
    `VenueClaim`, `Verification`, `Sponsorship` — created as empty
    forward-compatible tables per Section 5/35, but not exposed via API
    until Release 2.

Each batch ships with its own fixtures/seed data and is reviewed at the gate
that first needs it (batch 1-2 at Gate 2, batch 5-7 at Gates 3-4, etc.) —
this is a plan, not a mandate to run all 16 migrations before Gate 2 starts.
