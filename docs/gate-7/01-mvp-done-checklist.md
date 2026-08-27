# Gate 7 — Definition of MVP Done (Section 49 Checklist)

Section 49 is the spec's own exit criteria for the whole build, not just
Gate 7. This checklist is deliberately unflattering where that's the honest
answer — a checklist that only ever says "done" isn't checking anything.

| # | Section 49 criterion | Status | Evidence / gap |
|---|---|---|---|
| 1 | All Release 1 features pass acceptance criteria | **Partial** | See the acceptance-scenario table below — most are code-complete and covered by an integration test; none have been run against a live, seeded, running instance because Docker was never available in this build environment. |
| 2 | Core journeys work on supported mobile and desktop browsers | **Not done** | No browser was ever opened against a running instance this build — `npm run dev:web`/`dev:api` were never executed live. Typecheck/lint/build passing is not the same claim. |
| 3 | No critical/high unresolved security or child-safety finding remains | **Not done** | `npm audit` found 2 real high-severity advisories in `next@14.2.35`, fixed only by a major-version bump to `next@16.3.3` (a breaking change not applied here — see `00-hardening-report.md`). No child-safety-specific finding is known, but "no critical/high finding" is false while this one stands. |
| 4 | Accessibility audit meets the declared threshold with documented manual testing | **Partial** | Automated: the full `jsx-a11y/recommended` ruleset (~30 rules) now runs in `npm run lint` and passes clean — that part is real and repeatable. Manual: no screen-reader or keyboard-only manual testing was performed (no device/browser session existed to do it in) — the "documented manual testing" half of this criterion is not met. |
| 5 | AI evaluation passes agreed factuality, safety, and feasibility thresholds | **Partial** | The harness exists (`tests/aiEvaluation.test.ts`, 16 versioned cases covering every category Section 44 lists) and passes 100% — but only against `StubAiProvider`, which never claims anything, so "passes" here proves the harness and the architecture, not a real model's factual accuracy. No thresholds have been agreed because no real provider is configured (DL-008 still open). |
| 6 | Provider terms, attribution, caching, and data retention are reviewed | **Not done** | Explicitly still open — see `docs/gate-0/04-provider-licensing-questions.md`, unresolved since Gate 0. Nothing in later gates depended on this being resolved (Google Places/AI adapters run in stub mode throughout), so it was never blocking, but it's still not done. |
| 7 | Privacy controls, export, and deletion are functional | **Done** | Gate 6: `GET /me/export`, `POST /me/erase`, tested end-to-end including that login fails after erasure. |
| 8 | Moderation and emergency suspension paths are staffed and tested | **Partial** | Tested: yes (Gate 6's flagged→suspended→appeal→restored loop, with an automated test covering the full cycle). Staffed: this is an operational/business decision (DL-009 in the Gate 0 decision log), not something code can satisfy — still open. |
| 9 | Analytics and cost controls are operating | **Partial** | Cost: genuinely zero, verified — no paid provider is configured anywhere, confirmed at every gate's health check and cost-implications section. Analytics: **not built** — Gate 1's analytics event dictionary (`docs/gate-1/11-analytics-event-dictionary.md`) was never wired into running code; no event is actually emitted anywhere. This is a real, previously-unflagged gap being surfaced here rather than glossed over. |
| 10 | Backups and restoration are tested | **Not done** | `scripts/backup.sh`/`restore.sh` exist and are designed to be safe (restoration targets a throwaway `questboard_restore_test` database, never the live one, and verifies row counts) — but neither has actually been run, since there's no Docker Postgres in this environment. Written, not tested. |
| 11 | Massachusetts pilot data meets an agreed geographic readiness threshold | **Not applicable yet** | No pilot has run; no real MA place/quest data exists beyond the 6 seed quests. The `GeographicReadiness` scoring concept from Gate 1's data model was never implemented as running code — there's nothing to measure yet. |
| 12 | Known limitations are visible to users and documented for operators | **Partial** | Documented for operators: extensively (every gate report's "Known limitations" section, this checklist). Visible to users: partially — a few honest in-UI states exist already (`/discover`'s "Map view isn't wired up yet," the geocode-degraded message, the AI draft's "critical_unknown confidence" label) — but there's no general "here's what this pilot can't do yet" disclosure anywhere in the product. |

## Acceptance scenarios (spec Section 43)

| # | Scenario | Status |
|---|---|---|
| 1 | Guest finds an open, low-cost 2-hour museum/walking quest with time/cost/tier/confidence/accessibility visible | Code-complete, covered by `discovery.integration.test.ts` and the MFA seed quest; not run live |
| 2 | Rural user gets county-level nature options without fabricated venue detail | Seed quest (Quabbin) models this; no live rural data source exists beyond the seed |
| 3 | Family gets a rainy-day at-home pantry activity with age-suitable stages | Hearth guild + typed inventory exist (Gate 5); no age-suitability *logic* beyond the existing content/age-gate fields — a family quest isn't automatically filtered by child-safety rules the way adult content is |
| 4 | Wheelchair user requests a date activity; unknown accessibility isn't presented as confirmed | Directly modeled and tested (the Charles River seed quest + `communitySafety` a11y assertions) |
| 5 | A 16-year-old cannot see alcohol/gambling/adult-event quests | Age-gating exists and is tested (Gate 6) against a self-attested birth date and a hardcoded 21+ threshold — DL-002's real jurisdiction-aware minor-account rule is still open, so this is the *mechanism* proven, not the final legal rule |
| 6 | Creator converts a plain idea into editable epic copy and submits it | Done and tested (Gate 4 Forge flow) |
| 7 | An AI quest referencing a closed seasonal attraction is blocked or clearly unavailable | **Not done** — the feasibility evaluator has no live-hours/seasonal-closure check (needs a configured Places provider, Gate 0 licensing questions still open); only structural checks run today |
| 8 | Multi-stop itinerary replaces one unavailable venue without losing other locked stops | **Not done** — no multi-stop route builder exists (flagged as deferred since Gate 3) |
| 9 | A quest with uncertain legal access can't be presented as publicly verified | Modeled via `feasibility_confidence`/`publication_scope` and tested (low/critical confidence → `private` scope, never `public`) |
| 10 | User denies GPS and can still browse, plan, and honor-complete eligible quests | Browsing/planning: yes, always worked (no GPS required for discovery-by-search). Honor-completion: requires an account in this build (see Gate 5's known limitation) — a logged-out guest cannot complete a quest at all, which is a narrower reading than this scenario implies |
| 11 | A malicious creator submission is screened, reported, suspended, and audited | Done and tested end-to-end (Gate 6) |
| 12 | An offline quest packet records progress and uploads evidence once connectivity returns | Packet download: done (Gate 7). "Records progress offline and syncs" is only partially true — the client saves the packet's *content* for offline reading, but there's no offline evidence queue/sync UI; the idempotency-key mechanism (Gate 7) makes a *retried* evidence submission safe, which is the server-side half of this, not a full offline-queue client |
| 13 | Driving reveals a narrow fog route; walking completion reveals a larger area | Done and tested (Gate 7 exploration module) |
| 14 | A business promotion is labeled and can't alter its organic rating | **Not applicable yet** — no business/sponsorship features exist (correctly deferred to Release 2 per Gate 0) |
| 15 | A user deletes fog/location history without deleting unrelated achievements | Done and tested (Gate 7 — badges/XP explicitly verified unchanged after fog-history deletion) |

**Tally: 7 of 15 fully done and tested-in-code; 2 not applicable to this MVP scope (correctly deferred); 4 partial; 2 not done.** This is offered as the honest current state, not a passing grade — several of the "not done" items (seasonal closure detection, multi-stop routing) are real, scoped, known gaps rather than surprises.

## What this checklist means for "is Quest Board done"

By the spec's own Section 49 standard: **no.** Several criteria are
structurally blocked on decisions only you (or legal) can make — provider
ToS review, the MA pilot's formal-beta-vs-internal-pilot question, the
age-threshold decision, moderation staffing — and one is blocked on this
environment lacking Docker/a browser to actually run and click through the
thing. What *is* true: every gate's code is typechecked, linted (including
a real accessibility ruleset), and covered by tests that are either
currently green (unit) or written-and-ready (integration, pending a real
database). That's a meaningfully different and more honest claim than "MVP
done," and this table exists so the difference isn't lost.
