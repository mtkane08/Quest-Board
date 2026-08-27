> **Superseded (2026-08-26):** Per DL-012, Quest Board is being built purely
> from the spec — `questmap` is not used as a reference or reuse source going
> forward. This document is kept only as a historical record of the Gate 0
> survey.

# Gate 0 — Prior Art Assessment: `questmap`

`../questmap/` (sibling folder, no git history found) is a working, partially
built product covering a large fraction of Quest Board's *surface area* —
map-based quest discovery, XP/leveling, businesses, zones, weather-adapted
quests, AI generation. It's a genuinely useful reference. It also predates
this spec and diverges from it in ways that matter enough that it should
**not** be forked directly (see decision DL-012 — recommendation: reference
only, greenfield build in this repo).

## What exists there (verified by reading the code, not guessing)

**Monorepo:** npm workspaces — `packages/api` (Express + TypeScript),
`packages/web` (Next.js 14 + Leaflet/react-leaflet + Tailwind),
`packages/mobile` (Expo 51 / React Native + `react-native-maps`).

**Infra:** `docker-compose.yml` runs Postgres with **PostGIS** and **Redis**
locally — directly matches Section 36's suggested architecture.

**API dependencies actually installed:** `@anthropic-ai/sdk`, `stripe`,
`jsonwebtoken` + `bcryptjs` (JWT auth), `socket.io` (real-time), `node-cron`
(scheduled jobs), `web-push` (browser push with VAPID), `@aws-sdk/client-s3`
(object storage), `zod` (validation, shared across all three packages),
`express-rate-limit` + `helmet` (basic hardening already present).

**Schema (`packages/api/src/db/migrations/002_core_schema.sql` and later
files):** `users`, `categories` (13, UI-facing), `businesses` (with Stripe
subscription tiers baked directly into the table), `zones` (PostGIS polygon
boundaries), `quests`, plus later migrations for extended schema, additional
columns, and zone districts.

**Services (`packages/api/src/services/`):** `questGenerator.ts` /
`templateQuestGenerator.ts` / `poiQuestGenerator.ts` (three different quest-
generation strategies — template-based, POI-based via
`overpassService.ts`/OpenStreetMap, and presumably AI-based),
`weatherService.ts` + `utils/weatherRules.ts`, `zoneDiscoveryService.ts`,
`verificationService.ts`, `moderationService.ts`, `rewardService.ts` +
`utils/xpFormula.ts`, `stripeService.ts`, `notificationService.ts`.

**Routes:** auth, users, quests, map, cities, business, payments, webhooks,
completions, feed, leaderboard, posts, tasks, admin, contracts, weather.

**Web app:** board, feed, leaderboard, map, my-quests, notifications,
personal, profile (+ public profile by username), quests list, settings,
login/register — a nearly complete IA already, using Leaflet rather than
Google Maps.

**Mobile app:** login/register, tab layout (home/leaderboard/profile/quests),
quest detail screen — an Expo Router scaffold, functional-looking but smaller
than the web app.

## What's materially different from the spec (not just "less complete")

- **Map/place provider:** Mapbox (web tiles) + Leaflet + OpenStreetMap
  Overpass for POIs, vs. spec's normative "Google Maps Platform and Google
  Places... foundational" (Section 32). See `04-provider-licensing-
  questions.md` Q8 and decision DL-003.
- **Monetization-first schema:** the `businesses` table has
  `subscription_tier`, `billing_status`, `stripe_customer_id`, and
  `stripe_subscription_id` columns *in the core schema*, and `users` has
  `stripe_customer_id`, `stripe_connect_account_id`, `is_premium` on day one.
  The spec explicitly defers business monetization to Release 2 (Section 35)
  and lists "cash creator payouts" as an MVP non-goal (Section 5). Reusing
  this schema would import Release-2-scope commitments into an R1 build.
- **No age/child-safety model at all.** `users` has no date-of-birth, age-
  attestation, guardian relationship, or child-profile concept anywhere in
  the schema I read. The spec's Section 6 (role model), Section 26 (child
  privacy defaults), and Section 8 (age-gating adult content) are a
  first-class, safety-critical part of Quest Board with no analog here.
- **No accessibility model.** No accessibility-profile fields, no 5-state
  confidence enum (Section 27) anywhere in the schema. This is one of the
  spec's ten product principles (Principle 10) and is simply absent.
- **No provenance/confidence/trust-badge system.** The spec's entire
  feasibility/verification layer (Section 15 — trust badges, confidence
  tiers, source provenance per field) has no equivalent table or service.
  `verificationService.ts` exists but its actual scope needs a closer read
  before assuming it does the same job — from the file list alone, there's
  no `SourceRecord`/`FactualClaim`/`FeasibilityAssessment`-shaped schema.
- **Different quest taxonomy.** `quest_type` enum (`complete`, `attempt`,
  `practice`, `speed`, `efficiency`, `endurance`, `sponsored`,
  `paid_contract`, etc.) and `quest_mode` (`solo`, `coop`, `competitive`,
  `passive_tracking`, `business_sponsored`, `admin_curated`) don't map
  cleanly onto the spec's realms/guilds/tier system (Sections 8, 11) or its
  16 quest structures (Section 9). This is a different taxonomy designed
  around a different (more gamified/fitness-adjacent) product framing.
- **`role` is a free VARCHAR(20) default `'user'`** rather than the spec's
  role/permission-tuple model (Section 6, and this codebase's sibling
  fish-and-game project actually has a more spec-compatible
  `(action, entity, access)` permission model already, for reference).

## What's realistically reusable

- **Infra pattern**: the `docker-compose.yml` (Postgres+PostGIS, Redis,
  healthchecks) is a good starting template regardless of schema decisions.
- **PostGIS usage patterns**: `GEOGRAPHY(POINT,4326)` for locations,
  `GEOGRAPHY(POLYGON,4326)` for zone boundaries, and GIST indexes are
  correct, idiomatic choices worth carrying forward as patterns (not the
  literal migration files, given the schema differences above).
- **Weather-adaptive quest logic** (`weatherService.ts`,
  `utils/weatherRules.ts`) is a reasonable reference for Section 16/20's
  weather-triggered behavior once we pick a weather provider.
- **OSM Overpass integration** (`overpassService.ts`) is directly useful as
  the *fallback* POI source discussed in decision DL-003, if that option is
  chosen.
- **XP formula** (`utils/xpFormula.ts`) is a reasonable starting point to
  look at when calibrating DL-006, even though the spec's factor-weighted
  tier system (Section 11) is structurally different from a simple XP
  formula and would need its own design.
- **Expo mobile scaffold**: legitimate head start for Release 2 native
  mobile (Section 35), but should not be activated during Release 1 per the
  MVP non-goals (Section 5) — see decision DL-012.

## Recommendation

Build this repo greenfield against the spec (already underway with this
Gate 0 audit). Keep `questmap` as a reference implementation to consult for
specific technical patterns (PostGIS queries, weather rules, Overpass
integration, XP formula shape) during Gate 2+ implementation, but do not
import its schema, its Stripe-first business model, or its taxonomy. Revisit
its Expo mobile app specifically at the Release 2 planning gate.
