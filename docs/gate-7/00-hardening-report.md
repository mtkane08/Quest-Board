# Gate 7 — Exploration and Hardening: Milestone Report

Per Section 47's per-milestone reporting requirement. **This is the final
gate in the spec's own implementation plan** (Section 47 defines Gates 0-7
only) — see `01-mvp-done-checklist.md` alongside this report for the honest
answer to "is it done," which is more nuanced than a single yes/no.

## Requirements completed

Gate 7's scope per Section 47 is opt-in fog sessions, regional progress,
offline quest packets, performance/security/accessibility remediation,
evaluation suites, backups/restoration, and pilot readiness.

| Item | Status | Where |
|---|---|---|
| Opt-in fog sessions | Done — foreground-only, explicit start/ping/stop, never background tracking | `apps/api/src/modules/exploration/` |
| Regional progress | Done, with an honest substitution: real town/county names aren't resolved (no geocoding provider configured); a coarse lat/lng grid stands in as the "region" | `modules/exploration/repository.ts` `getRegionProgress` |
| Offline quest packets | Done — server-side packet endpoint + client-side save/view/remove, no service worker (see limitations) | `modules/offline/`, `apps/web/lib/offlinePackets.ts`, `apps/web/app/offline/` |
| Idempotency-Key enforcement | Done — closes an ADR-011 gap that had existed since Gate 2 | `apps/api/src/middleware/idempotency.ts` |
| Performance remediation | **Not attempted** — see limitations; no load testing infrastructure exists and no live server was ever run to profile | — |
| Security remediation | Partial — AI endpoint rate-limited tighter than general API traffic; dependency scan added to CI; one real unresolved finding documented, not hidden | `middleware/rateLimit.ts` `aiRateLimit`, `.github/workflows/ci.yml` |
| Accessibility remediation | Done (automated layer) — full `jsx-a11y/recommended` ruleset now enforced in lint/CI, passing clean; manual/assistive-tech testing not done (no device available) | `apps/web/.eslintrc.json` |
| Evaluation suites | Done (harness + versioned cases); not exercised against a real model | `apps/api/tests/ai-eval/cases.json`, `aiEvaluation.test.ts` |
| Backups/restoration | Scripts written, not executed | `scripts/backup.sh`, `scripts/restore.sh` |
| Pilot readiness | Documented honestly in `01-mvp-done-checklist.md` | — |

## Why idempotency got real, and why it's opt-in

`idempotency_keys` has existed since Gate 2's foundation migration and
ADR-011 named it as a requirement, but nothing used it until now. The
motivating trigger this gate is Section 30's offline-sync requirement: a
queued evidence/completion request retried after reconnecting must not
double-award XP or double-record evidence. The middleware
(`apps/api/src/middleware/idempotency.ts`) only activates when a client
sends an `Idempotency-Key` header — a client that doesn't send one gets
exactly today's behavior, unchanged. This was a deliberate compatibility
choice: making the header *required* would have broken every prior gate's
integration test suite (none of them send it), and ADR-011's own language
("where retries could duplicate...") reads as risk-driven guidance for
clients that need it, not a blanket mandate that breaks simpler callers.

## Why fog-of-war uses a grid, not real place names

Section 20's "town/city and rural-county progress" needs to know what town
a coordinate is *in* — that's reverse geocoding, which needs a configured
Places provider. None exists in this environment (same standing limitation
as every gate touching Places/AI). Rather than block the whole feature on
that, `modules/exploration/tiles.ts` quantizes coordinates into a coarse
~1km grid cell as a region proxy. This is a genuine, working implementation
of the *mechanic* (opt-in reveal, travel-mode-dependent radius, quest-
completion bonus, cautious-not-punitive impossible-travel detection,
delete-without-losing-achievements) — it's specifically the "what do we
call this region" cosmetic layer that's stubbed, and swapping in real
region names later doesn't change the schema or the reveal logic at all.

## Files changed

New:

- Migration `0016_exploration.sql`
- `apps/api/src/middleware/idempotency.ts`
- `apps/api/src/modules/exploration/{tiles,repository,routes}.ts`
- `apps/api/src/modules/offline/packetBuilder.ts`
- `apps/api/tests/{exploration,offlinePacket,idempotency.integration,exploration.integration,offlinePacket.integration,aiEvaluation}.test.ts`
- `apps/api/tests/ai-eval/cases.json` (16 versioned evaluation cases)
- `scripts/backup.sh`, `scripts/restore.sh`
- `apps/web/lib/offlinePackets.ts`, `apps/web/app/offline/page.tsx`,
  `apps/web/components/SaveOfflineButton.tsx`
- Extended `apps/api/src/modules/attempts/routes.ts` (idempotency on
  evidence/complete/rating, quest-completion fog-reveal hook), `quest-catalog/
  routes.ts` (offline packet endpoint, idempotency on publish),
  `middleware/rateLimit.ts` (`aiRateLimit`)
- Extended `apps/web/app/profile/page.tsx` (exploration widget: reveal
  area, clear fog history) and `app/layout.tsx` (Offline nav link)
- `apps/web/.eslintrc.json` (`jsx-a11y/recommended`),
  `apps/web/package.json` (`eslint-plugin-jsx-a11y`)
- `.github/workflows/ci.yml` (dependency scan step)

Wired into `apps/api/src/app.ts`: `/api/v1/exploration/*`, plus the
`aiRateLimit` middleware on `/api/v1/ai`.

## Migration

20. `0016_exploration.sql` — `exploration_sessions` (with last-known-ping
    columns, used only to evaluate impossible-travel on the *next* ping —
    not a location history), `map_tile_discoveries`,
    `suspicious_movement_flags` (logged, never auto-punitive).

## Tests and results

```
Test Files  11 passed | 10 skipped (21)
     Tests  92 passed | 51 skipped (143)
```

New this gate: `exploration.test.ts` (10 pure tests — tile quantization,
travel-mode reveal radius, impossible-travel detection including the
"backward timestamp doesn't divide by zero" edge case), `offlinePacket.test.ts`
(3 pure tests), `aiEvaluation.test.ts` (19 tests — 16 versioned cases plus 3
contract-level assertions, all passing against the stub provider),
`idempotency.integration.test.ts` (2 tests: a retried `/complete` with the
same key doesn't double-award XP; behavior without a key is unchanged from
every earlier gate), `exploration.integration.test.ts` (7 tests: opt-in
default-empty state, walk-reveals-more-than-drive, suspicious-jump flagging
without blocking, quest-completion bonus reveal via the real attempts flow,
history deletion preserving badges/XP, and session ownership/state-guard
enforcement), `offlinePacket.integration.test.ts` (2 tests).

**Verification method for the DB-dependent code this gate**: same Docker/
native-Postgres limitation as every prior gate. I want to be direct about
what that means at this point in the project: **nothing in this entire
build has been run against a live server or a real browser.** Every gate's
correctness claim has rested on TypeScript's type checker, ESLint, unit
tests that don't need infrastructure, and my own line-by-line reading of
the SQL and request/response wiring for everything that does. That's a real
and meaningful form of verification — this gate's own idempotency and
exploration modules had their parameter counts traced by hand the same way
every prior gate's did — but it is not the same claim as "this works,"
and Gate 7's own checklist (`01-mvp-done-checklist.md`) says so plainly
rather than letting seven gates of careful code review read as equivalent
to seven gates of tested software.

## Manual verification steps

1. `docker-compose up -d postgres redis && npm run db:migrate && npm run db:seed`
2. `npm run dev:api` and `npm run dev:web` — **this is the first time in
   the whole project these commands would actually be run**, if you follow
   these steps. Please do.
3. Complete a quest twice with `curl -H "Idempotency-Key: test-1"` on the
   second `/complete` call repeated — confirm XP isn't awarded twice.
4. On `/profile`, click "Reveal my current area" (grant location
   permission) — confirm the tile count increases; click "Clear fog
   history" — confirm it resets to 0 without touching your XP/badges above.
5. On a quest detail page, click "Save for offline," then visit `/offline`
   — confirm it lists the quest with objectives and safety notes, and
   shows a sensible age label.
6. `bash scripts/backup.sh` then `bash scripts/restore.sh backups/<file>` —
   confirm the row-count verification passes and the throwaway database is
   cleaned up afterward.
7. `npm audit --omit=dev` — confirm you see the same Next.js findings
   described below, and decide whether/when to take the major-version
   upgrade.

## The one real security finding this gate surfaced

`npm audit` found `next@14.2.35` (the version installed since Gate 2) has
2 high-severity advisory clusters, fixed only in `next@16.3.3` — a major
version bump. I did not apply it: a major-version upgrade to the one
framework the entire web app is built on, with no way to run the app and
confirm nothing broke, is exactly the kind of change that needs a human
decision and a real test pass, not a same-turn "npm audit fix --force."
This is now tracked as an open item in `01-mvp-done-checklist.md` rather
than silently left for someone to discover later. `apps/api`'s dependencies
have zero known vulnerabilities (`npm audit --omit=dev` in that workspace
returns clean).

## Accessibility / security / privacy review

- **Accessibility:** `eslint-plugin-jsx-a11y`'s full recommended ruleset
  (~30 rules — label associations, interactive-element semantics, ARIA
  prop validity, keyboard accessibility, and more) is now enforced in
  `npm run lint` for the web workspace and passes clean against the actual
  codebase built across all 7 gates — this is the first *automated,
  broad* accessibility check this project has had, versus the narrower
  6-rule subset `eslint-config-next` includes by default.
- **Security:** the AI generation endpoint now has its own tighter rate
  limit (15/min vs. the general 120/min) given it's the one endpoint
  category with real future cost exposure; idempotency keys close a
  double-submission class of bug; `npm audit` is now a standing CI step.
  The one real finding (Next.js) is documented, not hidden or force-fixed.
- **Privacy:** exploration ping coordinates are stored only as the
  *derived tile ID*, never as a raw lat/lng history — `map_tile_discoveries`
  has no coordinate columns, only `tile_id`, so even the stored discovery
  record can't reconstruct a precise movement trail finer than the ~1km
  grid. `exploration_sessions.last_lat/last_lng` is overwritten in place
  (one row per session, not appended), so it's a momentary comparison
  value, not a location history either.

## API and AI cost implications

Still zero for API/AI provider calls. The one new cost-relevant control
this gate adds is the tighter AI rate limit, which matters once a real
provider is configured (still blocked on DL-008).

## Known limitations

- **No load/performance testing exists.** Section 40's latency targets
  (p75 first-content, p95 API reads, map viewport responsiveness) have
  never been measured against a running instance. This is the most
  significant Gate 7 sub-area that got no real attention — flagging
  clearly rather than padding the report with untested targets restated as
  if they were verified.
- **No service worker / true offline-first PWA behavior.** "Save for
  offline" stores packet JSON in `localStorage`; there's no app-shell
  precaching, no offline fallback page, and no background-sync queue for
  evidence submitted while disconnected (the idempotency-key mechanism
  makes a *retried* submission safe once connectivity returns, but nothing
  in the client actually queues and auto-retries yet).
- **Regional progress uses a coordinate grid, not real place names** — see
  the design-choice note above.
- **Backups/restoration scripts are untested** — written correctly by
  inspection (the restore script targets a disposable database and
  verifies row counts before cleaning up), never executed.
- **No real AI model has ever been evaluated** through the Section 44
  harness — it currently proves the harness and the architecture's
  injection-resistance, not any model's actual factual accuracy.
- **The Next.js dependency vulnerability is unresolved** — see above.
- **No analytics events are actually emitted anywhere in the running
  code**, despite Gate 1 having designed a full event dictionary. This
  should have been flagged in an earlier gate's report and wasn't — it's
  being surfaced now rather than left for a future reader to discover.
- Same Docker/native-Postgres/no-live-browser verification caveat as every
  prior gate, stated at its starkest in this report's "Tests and results"
  section above.

## Deferred work

Load/performance testing, a true service-worker offline architecture,
real region-name resolution (needs a Places/geocoding provider), the
Next.js major-version security upgrade (needs a dedicated test pass), a
real AI provider evaluation run, executed (not just written) backup/
restore verification, and actual analytics event emission wired into the
running API.

## This is the last spec-defined gate

Section 47 defines Gates 0 through 7 and no further gates. Sections 5, 35,
and 50 describe Release 1.1/2/Later-platform features (native mobile,
business/organization verification, in-app payments, broader public
matchmaking, international expansion) that are explicitly out of MVP scope
and were correctly not built here. What remains before this could honestly
be called a shipped MVP is exactly what `01-mvp-done-checklist.md` lists:
running it for real (this environment never had Docker or a browser to do
that with), the decisions only you/legal can make (Gate 0's still-open
decision log rows), and the handful of gaps this report names outright
rather than glossing over.
