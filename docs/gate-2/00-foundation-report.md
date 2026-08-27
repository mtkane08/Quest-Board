# Gate 2 — Foundation: Milestone Report

Per Section 47's per-milestone reporting requirement. This is the first gate
that contains actual application code, per the Section 47-48 execution
contract.

## Requirements completed

Gate 2's scope per Section 47 is repository structure, local environment, CI,
authentication, database, design tokens, observability, feature flags, test
harness, seed taxonomy, provider interfaces, and a vertical health/demo path.
Status of each:

| Item | Status | Where |
|---|---|---|
| Repository structure | Done | npm workspaces monorepo: `apps/api`, `apps/web` |
| Local environment | Done | `docker-compose.yml` (Postgres+PostGIS, Redis), `.env.example` |
| CI | Done | `.github/workflows/ci.yml` — typecheck, lint, migrate, seed, test, build against real service containers |
| Authentication | Done (baseline) | Cookie session auth (`express-session` + Redis store), register/login/logout/guest-session/me — `apps/api/src/modules/identity/` |
| Database | Done (Gate 2 scope) | PostgreSQL+PostGIS via `pg`; migrations 0001-0003 (extensions/audit/idempotency/flags, identity, taxonomy) |
| Design tokens | Done | `apps/web/app/globals.css` CSS variables + `tailwind.config.ts`, fantasy/plain tone switch (Section 28) |
| Observability | Done (Gate 2 scope) | Structured JSON logger with request IDs; `/health` endpoint reports DB/Redis/provider status |
| Feature flags | Done (Gate 2 scope) | `feature_flags` table + `apps/api/src/lib/featureFlags.ts`, two seeded flags |
| Test harness | Done | Vitest + Supertest, unit + integration suites, integration tests skip gracefully (not fail) when infra is unreachable |
| Seed taxonomy | Done | 4 realms, 12 guilds (with age-gate metadata on The Revels / Trials of Might), 23 tags, 12 tones — transcribed from spec Sections 8 and 28 |
| Provider interfaces | Done (interfaces + stub + real Places client, no AI vendor wired) | `apps/api/src/providers/places/`, `apps/api/src/providers/ai/` |
| Vertical health/demo path | Done | Web home page server-renders API health + live guild list |

Also implemented ahead of their listed gate, because the Gate 1 ADRs required
them as day-one architectural rules rather than later add-ons: ADR-008's
role/permission tuple model (`apps/api/src/modules/identity/permissions.ts`),
ADR-011's idempotency-key table (schema only — no mutation endpoint needs it
yet), and ADR-012's `data_class` tagging on every personal-data table.

## Files changed

New repository. Top-level additions:

- `package.json`, `.gitignore`, `.editorconfig`, `.prettierrc.json`,
  `docker-compose.yml`, `.env.example`
- `.github/workflows/ci.yml`
- `apps/api/` — full Express+TypeScript service (see module list below)
- `apps/web/` — Next.js App Router client (layout, home page, design tokens,
  API client helper)
- `docs/gate-2/00-foundation-report.md` (this file)

API modules added: `config/env.ts`, `lib/{logger,errors,featureFlags}.ts`,
`db/{client,redis,migrate,seed}.ts` + 3 migrations + seed data,
`middleware/{auth,errorHandler,rateLimit,requestId,validate}.ts`,
`modules/identity/{types,permissions,service,routes}.ts`,
`modules/taxonomy/routes.ts`, `providers/places/{PlacesProvider,
GooglePlacesProvider,StubPlacesProvider}.ts`, `providers/ai/
{AiGenerationProvider,StubAiProvider}.ts`, `app.ts`, `index.ts`.

## Migrations

Executed in order by `apps/api/src/db/migrate.ts` (tracked in a
`schema_migrations` table so re-running is a no-op):

1. `0001_extensions_and_audit.sql` — `uuid-ossp`, `postgis` extensions;
   `audit_events`, `idempotency_keys`, `feature_flags`.
2. `0002_identity.sql` — `users`, `profiles`, `role_grants`, `consents`,
   `age_attestations`, `households`, `child_profiles`,
   `guardian_relationships`.
3. `0003_taxonomy.sql` — `taxonomy_nodes`, `tags`, `themes`, `tones`.

This is batches 1-3 of the 16-batch plan in
`docs/gate-1/03-data-model.md`; batches 4+ (quest catalog, feasibility,
attempts, etc.) land at the gates that need them (Gates 3-7), not now.

## Tests and results

```
Test Files  3 passed | 3 skipped (6)
     Tests  10 passed | 9 skipped (19)
```

- **Passing without any infrastructure** (env validation, ADR-008 permission
  logic, provider stub graceful-degradation behavior): 10/10.
- **Skipped locally**: 9 integration tests (health, auth flow, taxonomy
  reads) that require a real Postgres+PostGIS and Redis. They skip with an
  explicit console message rather than failing, and are designed to run for
  real in CI (`.github/workflows/ci.yml` provisions both as service
  containers) — see "Known limitations" for why they didn't run locally in
  this session.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass clean
  across both workspaces.

## Manual verification steps

1. `cp .env.example .env` and fill in `SESSION_SECRET` (anything ≥16 chars
   for local dev).
2. `docker-compose up -d postgres redis` (requires Docker Desktop —
   confirmed **not** installed in the environment this was built in; these
   steps are written for you to run, not verified end-to-end here).
3. `npm install`
4. `npm run db:migrate` then `npm run db:seed`.
5. `npm run dev:api` (port 3001) and, in another terminal, `npm run dev:web`
   (port 3000).
6. Open `http://localhost:3000` — should show API health as `ok` for
   database/redis and `degraded` for placesProvider/aiProvider (expected,
   no keys configured), plus the 12 seeded guilds.
7. `curl -X POST http://localhost:3001/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"you@example.com","username":"you","password":"a-long-enough-password"}'`
   should return `201` with a session cookie.

## Accessibility / security / privacy review

- **Accessibility:** design tokens support a plain/fantasy tone switch
  without altering markup (Section 28); `prefers-reduced-motion` respected
  globally; focus-ring utility defined. No screens with real content exist
  yet to run a WCAG audit against — that starts at Gate 3 when the discovery
  UI ships (QB-192 tracks the actual audit).
- **Security:** Helmet default headers, CORS locked to `WEB_ORIGIN`,
  cookie session is `httpOnly`/`sameSite=lax`/`secure` in production,
  passwords hashed with bcrypt (12 rounds), auth endpoints rate-limited
  separately and more strictly than general API traffic, all secrets read
  from environment only (never committed — `.env` is gitignored,
  `.env.example` has blanks only). No upload endpoints exist yet, so
  EXIF-stripping/media-scanning controls (Section 26, 39) aren't applicable
  until Gate 5/6.
- **Privacy:** `data_class` column present on every personal-data table
  per ADR-012, ready for the export/erase job that gets built once there's
  more than identity data to export. No location or evidence data is
  collected at this gate — nothing yet to retain or delete.

## API and AI cost implications

Zero. Both the Places and AI provider adapters run in stub mode by default
(no API keys in `.env.example`), and the health endpoint reports them as
`degraded` rather than calling out to a paid API. No cost exposure until a
real key is configured, which won't happen before the Gate 0 licensing
questions (`docs/gate-0/04-provider-licensing-questions.md`) and cost-budget
decision (DL-008) are resolved.

## Known limitations

- **Docker was not available in the environment this was built in**, so
  migrations/seed/integration tests are verified by code review, typecheck,
  and the CI workflow definition — not by an actual local run against
  Postgres+PostGIS. Please run the manual verification steps above and
  report back if anything doesn't work as written.
- The local machine has a *native* PostgreSQL 15 service already running,
  but without the PostGIS extension installed and without known credentials
  — it was deliberately left untouched rather than guessed at or modified;
  `docker-compose.yml` is the intended local dev path.
- The migration runner is a small hand-written script, not a full framework
  (no rollback support beyond manual SQL). Fine at this scale; revisit if
  migration count/complexity grows past what's easy to reason about by hand.
- The role/permission matrix (`apps/api/src/modules/identity/permissions.ts`)
  only covers entities that exist so far (profile, taxonomy, audit-log,
  feature-flag) — it's the real mechanism from ADR-008, populated
  incrementally as each module ships, not the full
  `docs/gate-1/05-role-permission-matrix.md` yet.
- No email verification, password reset, or 2FA flow yet — flagged as a
  reasonable hardening addition in the Gate 1 threat model (account
  takeover, threat #7) but not spec-mandated for Gate 2.
- The web app has no client-side interactivity yet (pure server-rendered
  demo page) — no theme toggle control, no login form. That's Gate 3
  (Discovery vertical slice) scope.

## Deferred work (explicitly not attempted this gate)

Everything in Gates 3-7 per `docs/gate-1/02-system-context-and-modules.md`'s
vertical-slice mapping: quest catalog, discovery/map, AI generation,
feasibility evaluation, attempts/completion, Hearth, social/parties,
moderation, exploration/fog, and all Release 2 business/org functionality
(intentionally not even stubbed yet, per the Gate 0 resolution of
Contradiction C-1).

## Next gate

**Gate 3 — Discovery vertical slice**: map/list search, manual-location
fallback, the Places adapter actually wired into a search endpoint, quest
cards/details (against seed quest fixtures, since Quest Catalog doesn't
exist until this gate adds it), filters, trust/confidence display, and
accessible list parity. Per the execution contract, this report is the stop
point for your review before that work starts.
