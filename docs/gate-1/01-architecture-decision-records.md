# Gate 1 — Architecture Decision Records

Each ADR: context, decision, consequences. All are made purely from the spec
(`docs/spec/Quest_Board_Master_Product_Specification.md`) and the resolved
Gate 0 decision log. Status is `Proposed` until Gate 1 sign-off.

## ADR-001: Modular monolith, not microservices, through Release 1.1

**Context:** Section 36 says "begin as a modular monolith unless scale or
team boundaries justify services," and lists 13 architectural boundaries
(Section 36) that must exist as internal module separations regardless.

**Decision:** One deployable Node.js/TypeScript backend service. Each
boundary from Section 36 (Identity/Authorization, Quest catalog/versioning,
Discovery/Recommendation, Places/provider cache, Generation/orchestration,
Feasibility/Provenance, Attempts/Completion/Evidence, Social/Parties,
Progression/Rewards, Moderation/Safety, Organizations/Businesses,
Notifications, Analytics/Audit) is a top-level source directory with its own
types, no reaching into another module's internals — cross-module calls go
through an explicit exported interface. Background/slow work (feasibility
refresh, moderation, notifications, AI generation) runs as queued jobs, not
inline requests, per Section 36.

**Consequences:** Single deploy pipeline and shared DB simplify Release 1-1.1
operations. Module boundaries must be enforced by convention/lint rule (e.g.
import restrictions) since there's no process boundary forcing it. Revisit
if/when a module's scaling or team-ownership needs diverge sharply (e.g., AI
generation needing independent scaling from the API) — not expected before
Release 2.

## ADR-002: Next.js (App Router) as the sole client for Release 1/1.1

**Context:** Section 36 requires a "TypeScript mobile-first React framework
with server rendering and PWA support." Section 5 excludes native apps from
MVP; Section 35 places native mobile at Release 2.

**Decision:** Next.js App Router, TypeScript, installable PWA via a service
worker (app-shell + quest-packet caching per Sections 8/30). No native mobile
project exists in this repo until the Release 2 gate.

**Consequences:** All UI/UX work targets one responsive codebase. The
accessible-list-equivalent-to-every-map-result requirement (Section 8, 45)
and WCAG 2.2 AA target (Section 27) apply to one client, simplifying the
accessibility audit surface for Release 1.

## ADR-003: PostgreSQL + PostGIS as the single system of record

**Context:** Section 36 requires "PostgreSQL with PostGIS for owned
geospatial data." Section 37 lists dozens of core entities with heavy
relational structure (versioning, state machines, audit trails).

**Decision:** One PostgreSQL database (with logical schemas or a consistent
table-prefix convention per module boundary) using PostGIS `geography` types
for all point/route/service-area data. No document store or secondary
database introduced in Release 1/1.1 — Section 36 only sanctions Redis as a
second datastore, and only for cache/queue.

**Consequences:** Migrations are the single schema-evolution mechanism (no
schema drift across stores). Geospatial queries (nearby search, viewport
queries, fog-of-war tile calculations, route continuity checks) all run
through PostGIS functions/indexes (`ST_DWithin`, GIST indexes) rather than
application-side distance math.

## ADR-004: Redis + BullMQ for cache and background jobs

**Context:** Section 36 requires "Redis-compatible cache/queue where
justified" and background workers for "feasibility refresh, moderation,
notifications, and AI generation." Section 38 requires long AI tasks to use
"job IDs or streaming with resumable status," and idempotency keys "where
retries could duplicate rewards, evidence, invitations, or payments."

**Decision:** Redis backs both an application cache layer (e.g., rate
limiting counters, session data, hot recommendation candidates) and a BullMQ
job queue for: AI generation jobs, feasibility re-verification, moderation
prescreening, notification dispatch, and offline-packet sync reconciliation.
Every job that can be retried carries an idempotency key derived from the
triggering request.

**Consequences:** Job status is queryable by job ID for the "resumable
status" UI pattern (Section 38). Idempotency must be designed into job
handlers from the start (e.g., upserts keyed by idempotency key), not bolted
on later.

## ADR-005: Google Maps Platform / Google Places as sole map & place data source, behind an adapter

**Context:** DL-003 (resolved): Google Maps Platform/Places only, no second
map/place vendor. Section 36 requires vendor-specific data to sit "behind
adapters." Section 42 requires graceful degradation when a provider fails.

**Decision:** A single `PlacesProvider` adapter interface wraps all Google
Places/Maps calls (Nearby Search, Place Details, Maps JS SDK loading). No
other module calls the Google SDK directly. Cached place data is stored with
explicit `retrieved_at`, `expires_at`, and `source = 'google_places'`
provenance fields (feeding the Section 10/15 provenance requirements) so
cache-TTL policy can be enforced and audited once the licensing questions in
`docs/gate-0/04-provider-licensing-questions.md` are answered. On provider
failure, discovery falls back to saved/community/at-home content with a
visible "provider degraded" state (QB-280), not to a second map vendor.

**Consequences:** Every place-derived field in the data model needs
provenance metadata from day one (see `03-data-model.md`). The adapter
interface exists even though it has one implementation, so licensing terms
that require re-fetching (e.g., a strict TTL) can be enforced in one place.

## ADR-006: AI services behind a vendor-agnostic interface; vendor selection deferred to Gate 2

**Context:** Section 14 requires schema-validated, versioned, cost-budgeted
AI services with no vendor mandated by the spec. DL-008 (cost budgets) and
the AI-provider licensing questions (Gate 0 doc, Q11-12) are still open.

**Decision:** Define one `AiGenerationProvider` interface (methods roughly:
`generateQuestDraft`, `runConversationalTurn`, `evaluateFeasibility`,
`classifyModeration`, `extractInventoryFromImage`, `translateContent`) that
each concrete AI service (Quest Forge, conversational guide, feasibility
evaluator, etc. — Section 14) calls through. The concrete model vendor is
chosen and wired in at Gate 2 once cost/data-terms questions are answered.
Every call is schema-validated (Zod) on both input and output per Section 14,
logged with prompt version + model identifier, and wrapped in a timeout/retry/
fallback per the AI implementation requirements list (Section 14).

**Consequences:** Swapping or A/B-testing model vendors later doesn't touch
product code. The AI evaluation suite (Section 44, QB-266) tests against the
interface's contract, not a specific vendor's API shape.

## ADR-007: Quests are versioned entities; attempts pin to the version they were started against

**Context:** Section 21: "Major edits to a quest with completions create a
new version. Historical attempts retain the version completed." Section 10
requires `version` and `parent/superseded version` fields on every quest.

**Decision:** `Quest` (stable identity) has many `QuestVersion` rows
(immutable once published and attempted against). Editing a *draft* quest
mutates the current `QuestVersion` in place; editing a *published* quest that
has one or more non-draft attempts creates a new `QuestVersion` and marks the
prior one superseded. Every `QuestAttempt` stores a foreign key to the exact
`QuestVersion` it was started against, never to the mutable `Quest` head.

**Consequences:** Rating/review and completion data always resolve
unambiguously to the quest content the user actually experienced, satisfying
QB-132. Discovery/search always reads the current published `QuestVersion` by
default, with old versions reachable only through an attempt's history.

## ADR-008: Role/permission model as `(action, entity, access)` tuples on roles

**Context:** Section 6 defines 11 role types with role-switching under a
single identity. Section 38 requires "authorization" as a first-class API
concern across every endpoint group. This workspace's sibling project
(`north-walpole-fish-and-game`, per its own CLAUDE.md) already documents this
exact `(action, entity, access)` tuple pattern as its permission model —
noted here only as a *familiar, proven pattern* to adopt on its merits, not
as code or schema reuse across projects.

**Decision:** Permissions are rows of `(action, entity, access)` — e.g.
`(publish, quest, any)`, `(edit, quest, own)`, `(moderate, report, any)` —
grouped into roles, and users hold one or more `RoleGrant`s (scoped, where
relevant, to a household/organization/business). Role-switching (Section 6)
changes which grants are active in the current session without changing
identity.

**Consequences:** New role types (e.g., Tourism board manager) are additive
role+permission rows, not new code branches. Authorization checks are
uniform: "does any active role grant `(action, entity, access)` for this
target?" See `05-role-permission-matrix.md` for the concrete matrix.

## ADR-009: Feasibility evaluation is a mandatory synchronous gate at publish time, plus an async recurring refresh job

**Context:** Section 15: feasibility confidence gates recommendation and
publication; "may not mark a quest feasible solely because the prose sounds
plausible" (QB-064). Section 24 requires a `Feasibility Review` publication
state. Conditions change over time (closures, weather), so a one-time check
isn't sufficient (Section 15's "last verification date," Section 24's
`Conditions Uncertain` post-publish state).

**Decision:** Every transition into `Submitted` triggers a synchronous
feasibility evaluation call that must return at least `medium` confidence
(Section 15's four-tier scale) before the quest can proceed to `Approved`;
`low`/`critical-blocker` results route to `Needs Correction` or block outright.
Separately, a recurring background job re-evaluates published, location-
dependent quests on a schedule (tied to their confidence tier and category —
e.g., seasonal/weather-sensitive quests refresh more often) and can transition
a live quest to `Conditions Uncertain` or `Temporarily Unavailable`.

**Consequences:** Publish latency includes one feasibility-evaluation round
trip (must be fast or asynchronous-with-polling — see `04-api-contracts.md`).
The refresh job's cost is bounded by the per-quest AI/provider budget (DL-008)
and should prioritize higher-traffic/higher-risk quests, not scan everything
uniformly.

## ADR-010: Accessibility and factual-confidence fields are explicit enums, never booleans

**Context:** Principle 10 and Section 27: "never infer that a place is
accessible merely because no contrary data exists"; risk R-11 in the Gate 0
risk register calls out that a boolean default can silently misrepresent
"unknown" as "accessible."

**Decision:** Every accessibility and confidence-bearing field uses a
closed enum with an explicit `unknown` member (e.g., accessibility:
`confirmed | reported | partially | not_accessible | unknown`; factual
confidence: `high | medium | low | critical_unknown`) — no nullable boolean
ever represents these. Filters that match "accessible" explicitly exclude
`unknown`; they never treat a missing value as a pass.

**Consequences:** Schema and filter logic are slightly more verbose than a
boolean shortcut, but the "never claim accessible without data" requirement
becomes a type-level guarantee instead of a code-review convention.

## ADR-011: Idempotency keys required on all reward/evidence/invitation/state-transition-triggering mutations

**Context:** Section 38 explicitly requires this "where retries could
duplicate rewards, evidence, invitations, or payments." Section 19's
anti-farming requirements and Section 24's audited state transitions
reinforce that duplicate-write bugs are a product-integrity risk, not just an
edge case.

**Decision:** `POST`/`PATCH` endpoints that grant XP/rewards, record
evidence, create invitations, or transition quest/attempt state require an
`Idempotency-Key` header; the API persists a short-lived key→result mapping
and replays the original response for a duplicate key rather than
re-executing the mutation.

**Consequences:** Client retry logic (especially on flaky mobile network
conditions, per the offline-sync requirement in Section 30) is safe by
default. Adds one small table (`idempotency_keys`) and a lookup on the
relevant write paths.

## ADR-012: Retention policy is enforced by table-level classification tags, not ad hoc deletion scripts

**Context:** Section 26 requires a retention matrix covering nine distinct
data categories with different purposes/retention/legal-basis, and QB-183
requires user-initiated export/erase.

**Decision:** Every table holding personal or location data carries a
`data_class` tag (matching the categories in
`docs/gate-1/08-privacy-retention-matrix.md`) read by one scheduled retention
job and one export/erase job, rather than each module implementing its own
deletion logic. New tables must declare a `data_class` at migration time —
enforced by a migration-review checklist, not runtime code.

**Consequences:** Adding a new data-bearing table forces an explicit
retention-policy decision at creation time instead of being discovered later
during a privacy audit.
