# Gate 3 — Discovery Vertical Slice: Milestone Report

Per Section 47's per-milestone reporting requirement.

## Requirements completed

Gate 3's scope per Section 47 is map/list search, manual-location fallback,
the place adapter, quest cards/details, filters, seed quests, trust/
confidence display, and accessible list parity.

| Item | Status | Where |
|---|---|---|
| Map/list search | Done (list fully wired; map returns the same data minus unlocated quests — no browser Maps key in this environment, see limitations) | `apps/api/src/modules/discovery/`, `apps/web/app/discover/` |
| Manual-location fallback | Done | `GET /api/v1/discovery/geocode`, wired into the `/discover` page's search box |
| Place adapter | Done (Gate 2's interface now has `geocode`; a real Google key still isn't configured — see Gate 0 licensing questions) | `apps/api/src/providers/places/` |
| Quest cards/details | Done | `apps/web/components/QuestCard.tsx`, `apps/web/app/quests/[id]/page.tsx` |
| Filters | Done (subset of Section 12's ~18: distance, guild, tier, max duration, wheelchair-accessible; remaining filters are additive work, not architectural gaps) | `apps/api/src/modules/quest-catalog/repository.ts` |
| Seed quests | Done — 6 quests, each written to prove a specific spec rule, not just as filler | `apps/api/src/db/seeds/quests.ts` |
| Trust/confidence display | Done | Trust badges + feasibility confidence shown on both card and detail |
| Accessible list parity | Done — `/discovery/list` and `/discovery/map` share one query builder (`listQuestCards`) so they can't drift; the web `/discover` page **is** the accessible list, and is explicit on-screen that it's the primary view since no map renders without a browser key |

Also added, because Gate 1's ADRs required them as architectural rules
rather than later cleanup: the quest publication state machine's `status`
column with the full enum from `docs/gate-1/06-state-machines.md` (only
`published` is reachable via seed data at this gate — the rest activate at
Gate 4/6), and per-field provenance tables (`provider_snapshots`,
`source_records`, migration 0004) even though nothing populates them yet
absent a real Places key.

## Files changed

New:

- Migrations `0004_places_cache.sql`, `0005_quest_catalog_core.sql`
- `apps/api/src/db/seeds/quests.ts`, updates to `apps/api/src/db/seed.ts`
- `apps/api/src/modules/quest-catalog/{types,repository,routes}.ts`
- `apps/api/src/modules/discovery/routes.ts`
- `apps/api/src/providers/places/PlacesProvider.ts` — added `geocode`
  (interface + Google implementation + stub)
- `apps/api/tests/{discoveryFilters,discovery.integration}.test.ts`
- `apps/web/lib/format.ts`, additions to `apps/web/lib/api.ts`
- `apps/web/components/{QuestCard,DiscoveryFilters}.tsx`
- `apps/web/app/discover/page.tsx`, `apps/web/app/quests/[id]/page.tsx`
- `apps/web/app/layout.tsx` — added primary nav (Home / The Realm)

Wired into `apps/api/src/app.ts`: `/api/v1/discovery/*`, `/api/v1/quests/*`.

## Migrations

5. `0004_places_cache.sql` — `provider_snapshots` (Google Places cache with
   TTL), `source_records` (per-field provenance, Section 15).
6. `0005_quest_catalog_core.sql` — `quests`, `quest_versions` (full
   publication-state enum, ADR-010 accessibility/confidence enums, a
   PostGIS `geography` column for nearby queries), `quest_place_references`.

This is the read-path subset of batch 5 in `docs/gate-1/03-data-model.md` —
objectives are a plain `text[]` for display, and Branch/Hint/Reward/
TierProfile child tables are deferred to Gate 4, which is what actually
writes quest content instead of just seeding it.

## Seed quests and what each one proves

| Quest | Proves |
|---|---|
| Three Wonders of the MFA | Acceptance scenario 1: low-cost, high-confidence, confirmed-accessible museum quest |
| Trace the Freedom Trail's Hidden Corners | Multi-factor tiering, partial accessibility (not a blanket yes/no) |
| Quabbin Reservoir Overlook Watch | Acceptance scenario 2: rural, medium confidence, accessibility honestly `unknown`, no fabricated venue detail |
| Pantry Alchemy: One-Pot Surprise | Acceptance scenario 3: at-home Hearth quest with no location — appears in `/list`, correctly excluded from `/map` |
| Riverside Sculpture Stroll for Two | Acceptance scenario 4: `wheelchair: unknown` is never presented as accessible |
| Brewery Flight & Trivia Night | Acceptance scenario 5 (age-gating direction): `adult_content`/`alcohol` quest excluded from discovery by default |

## Tests and results

```
Test Files  4 passed | 4 skipped (8)
     Tests  16 passed | 17 skipped (33)
```

New this gate: `discoveryFilters.test.ts` (6 tests, pure unit — no DB
needed) directly verifies the hard-constraint gate: adult content excluded
by default, wheelchair filter only matches `confirmed`/`reported` and never
`unknown` (risk R-11), filters are parameterized (not string-interpolated —
checked with a SQL-injection-shaped value). `discovery.integration.test.ts`
(8 tests) verifies distance ordering, the adult-content exclusion end to
end, the accessibility-unknown case on real seeded data, that `/map` results
are always a subset of `/list` results, graceful geocode degradation, and
that quest detail exposes every QB-031 preflight field.

**Verification method for the DB-dependent code this gate**: same
limitation as Gate 2 — no Docker in this environment, and the local native
Postgres has no PostGIS extension and unknown credentials, so it was left
untouched. Given this gate's SQL is meaningfully more complex (PostGIS
casts, dynamic parameterized filter clauses, a 31-column parameterized
INSERT), I manually traced every query's column list against its parameter
array and placeholder positions by hand instead of just trusting typecheck —
documented inline as I did it, not just asserted here. That is not a
substitute for actually running it. **Please run the manual verification
steps below before trusting this gate's SQL in anything beyond local dev.**

## Manual verification steps

1. `docker-compose up -d postgres redis`
2. `npm run db:migrate && npm run db:seed` — should log `seeded quests:
   inserted: 6, skipped: 0` on first run, `inserted: 0, skipped: 6` on
   re-runs (idempotent).
3. `npm run dev:api` and `npm run dev:web`.
4. Visit `http://localhost:3000/discover` — should show 6 quest cards
   (5 visible by default; the brewery/trivia quest is intentionally hidden).
5. Click "Use my location" (or type "Boston, MA" and Apply — geocode will
   report degraded without a key, which is expected) and confirm results
   re-sort by distance.
6. Check "Wheelchair accessible only" — should show only the MFA quest.
7. Click into a quest — detail page should show accessibility, safety
   notes, trust badges, and (for the Charles River quest) an explicit
   "unknown" accessibility state, not a false "yes."
8. `curl "http://localhost:3001/api/v1/discovery/list?limit=50"` — confirm
   the brewery/trivia quest is absent from the JSON.

## Accessibility / security / privacy review

- **Accessibility:** quest cards and detail pages use semantic
  `<dl>`/`<ul>` structure, `sr-only` labels for icon-free data points,
  non-color badges for trust/confidence/age-restriction/accessibility-
  unknown states (text labels, not just color), and the filter form is a
  plain keyboard-operable form with visible `<label>`s — no drag-only or
  hover-only interactions. A real WCAG 2.2 AA automated + manual audit
  (QB-192) still hasn't run; there's now enough real UI for that to be
  worth doing, which it wasn't at Gate 2.
- **Security:** all discovery/quest-catalog query parameters are Zod-
  validated before use; every dynamic filter value reaches SQL through a
  parameterized placeholder, never string interpolation (verified by the
  SQL-injection-shaped test case in `discoveryFilters.test.ts`); the
  `/quests/:id` route validates the id is a UUID before querying, so a
  malformed id 400s instead of hitting the database.
- **Privacy:** no personal or location data is stored by this gate's code —
  a browser geolocation coordinate is used only to build one API request
  and appears only in the URL query string transiently during that
  request/response cycle, never persisted server-side. (Putting it in a
  URL at all is a normal, accepted pattern for a client-initiated map
  search — it is not user PII being sent to a third party, just this app's
  own API.)

## API and AI cost implications

Still zero. `geocode` calls the Places adapter, which runs in stub mode
(returns `degraded: true`) without a configured key — no billed request is
made anywhere in this gate's code path in the environment it was built in.

## Known limitations

- **No live Google Places integration exercised** — `nearbySearch` and
  `getPlaceDetails` exist and typecheck but are not called from any route
  yet; discovery works entirely off seeded/community-shaped quest data.
  Wiring live Places results into discovery (e.g., as a supplementary
  "nearby POIs" layer) is reasonable Gate 3 follow-up work, not done here,
  since it would need the Gate 0 licensing questions answered first anyway.
- **No real map rendering.** The `/discover` page is honest about this
  rather than faking it — no Google Maps browser key exists in this
  environment (would need the Gate 0 licensing review before adding real
  billing exposure), so `/discovery/map` is implemented and tested at the
  API layer, but the web client only renders the list. Wiring the actual
  Google Maps JS SDK is a contained follow-up once a browser key exists.
- **Guild filter has no UI control** — `DiscoveryFilters.tsx` reads/writes
  a `guild` value but doesn't render a `<select>` for it yet; it's usable
  via the API/URL directly (`?guild=the_wilds`), just not from the visible
  form. Small, deliberately deferred rather than adding a 12-option select
  the design hasn't been thought through for.
- **Distance/limit pagination uses an offset-encoded cursor**, not a truly
  opaque cursor tied to a stable sort key — fine at this data volume, but
  if quests are inserted/deleted between paginated requests, an offset
  cursor can skip or repeat a row. Flagging so it isn't mistaken for the
  real cursor semantics `docs/gate-1/04-api-contracts.md` describes.
- **Age-restriction filtering is a global default, not a per-user gate.**
  Adult content is excluded for everyone by default (safe direction) rather
  than shown/hidden based on an authenticated user's actual attested age —
  that requires session/role integration into discovery, deferred
  intentionally until DL-002 (age threshold) is resolved and identity is
  wired into this module.
- Same Docker/native-Postgres caveat as Gate 2 — see "Tests and results."

## Deferred work

Full Section 12 filter set (budget, indoor/outdoor as a first-class toggle
rather than a tag lookup, mood, weather tolerance, reservation tolerance),
live Places integration, real map rendering, Objective/Branch/Hint/Reward
relational tables, TierProfile weight overrides, ranking beyond distance
(relevance/quality/novelty/social context per Section 12) — all reasonable
Gate 4+ or later-in-Gate-3-if-you-want-more-breadth work, not attempted here
to keep this milestone reviewable.

## Next gate

**Gate 4 — Forge and feasibility**: structured quest editor (so quests can
be created through the product instead of only seeded), AI generation/
refinement via the `AiGenerationProvider` interface from Gate 2, the
feasibility evaluator and its mandatory publish-time gate (ADR-009), tier
calculation from factor scores, moderation submission, and the AI failure
fallbacks. Per the execution contract, this report is the stop point for
your review before that work starts.
