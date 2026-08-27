# Gate 1 — Analytics Event Dictionary

Events needed to compute the Section 34 metric set, segmented (per Section
34's explicit requirement) by quest origin, category, geography, accessibility
use, party type, and confidence — **without exposing sensitive individuals**,
meaning these events carry aggregable dimensions, not raw location/identity
beyond what's already visible in the product itself.

| Event | Trigger | Key properties | Feeds metric |
|---|---|---|---|
| `quest_viewed` | Quest detail screen opened | quest_id, origin_type, guild_id, confidence_tier, entry_surface (feed/map/search/party) | Time from discovery to start (denominator) |
| `quest_started` | `POST /attempts` succeeds | quest_id, quest_version_id, origin_type, guild_id, tier, party_size, accessibility_filters_active (bool, not the values) | Quest starts; discovery-to-start time |
| `quest_completed` | Attempt reaches `Completed` | quest_id, quest_version_id, duration_actual, evidence_type | Completion rate |
| `quest_partially_completed` | Attempt reaches `PartiallyCompleted` | same as above + objectives_completed_count | Partial-completion rate |
| `quest_abandoned` | Attempt reaches `Abandoned` | quest_id, stage_reached | Completion-funnel drop-off |
| `quest_expired` | Attempt reaches `Expired` | quest_id | Completion-funnel drop-off |
| `quest_generation_requested` | `POST /ai/quest-forge` or nearby-variant call | service_type, has_anchor_place (bool) | AI generation acceptance/edit/abandon rate (denominator) |
| `quest_generation_accepted` | Draft submitted without further edits | job_id | AI acceptance rate |
| `quest_generation_edited` | Draft submitted after manual edits post-generation | job_id, fields_changed_count | AI edit rate |
| `quest_generation_abandoned` | Draft discarded without submitting | job_id | AI abandon rate |
| `quest_submitted` | Quest → `Submitted` | quest_id, creator_trust_tier | Public quest creation rate (numerator input) |
| `quest_approved` | Quest → `Approved` | quest_id | Public quest approval rate |
| `quest_published` | Quest → `Published` | quest_id, publication_scope | Public quest creation and approval rate |
| `feasibility_blocked` | Feasibility evaluator returns low/critical | quest_id, blocker_reason_code | Safety/stale-data incident rate input |
| `rating_submitted` | `POST /attempts/{id}/rating` | quest_id, enjoyment, accuracy, tier_accuracy, would_recommend | Quest accuracy/recommendation/tier ratings |
| `report_filed` | `POST /reports` | target_type, category, severity | Safety and stale-data incident rates |
| `safety_incident_opened` | `SafetyIncident` created | category, suppression_applied (bool) | Safety incident rate |
| `party_invite_sent` | `POST /parties/{id}/invitations` | party_id | Invite/party conversion (denominator) |
| `party_invite_accepted` | `POST /invitations/{code}/accept` | party_id | Invite/party conversion (numerator) |
| `weekly_active_adventurer` | Derived/rollup, not client-fired | user_id (internal only), week | Weekly retained adventurers |
| `geographic_readiness_computed` | Scheduled job (internal) | region_id, score_components | Geographic coverage and readiness |
| `provider_degraded` | A provider adapter (Places/weather/AI) enters degraded fallback | provider, module | Reliability tracking (Section 40's graceful-degradation requirement) |
| `ai_cost_budget_warning` | Per-user or global cost budget threshold crossed | scope (`user`/`global`), service_type | Cost monitoring (Section 40) |
| `business_participation_event` | Reserved for Release 2 | — | Business/creator participation (not tracked in R1) |

## Segmentation dimensions (attached where applicable, not as separate events)

`origin_type` (ai_suggested/community/creator_verified/business_verified/
curated), `guild_id`/`realm_id`, `geo_region` (town/city/county-level, never
precise coordinates in an analytics event), `accessibility_filters_active`
(boolean flag only — never the specific accessibility profile values, which
stay in the private accessibility-profile store per `08-privacy-retention-
matrix.md`), `party_type` (solo/couple/family/group), `confidence_tier`.

## Explicit non-events (things that must *not* be logged as analytics)

- Precise GPS coordinates of any user, ever, in an analytics event payload —
  only region-level aggregates.
- Raw accessibility profile values (only the boolean "filters were active").
- Any event tied to a `ChildProfile` that isn't already covered by the same
  aggregate rollups as adult accounts (no special child-tracking granularity,
  consistent with Section 26's stronger privacy defaults for minors).
- Free-text content of AI conversations, ratings, or reports (analytics gets
  structured metadata only; the content itself lives in its own retention-
  governed table per `08-privacy-retention-matrix.md`, accessible only through
  that table's own access controls).
