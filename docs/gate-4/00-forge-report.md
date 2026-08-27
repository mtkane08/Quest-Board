# Gate 4 — Forge and Feasibility: Milestone Report

Per Section 47's per-milestone reporting requirement.

## Requirements completed

Gate 4's scope per Section 47 is the structured quest editor, AI generation/
refinement, provenance, feasibility jobs, tier calculation, moderation
submission, and failure fallbacks.

| Item | Status | Where |
|---|---|---|
| Structured quest editor | Done — create/edit/submit/publish over HTTP, plus a working web form | `apps/api/src/modules/quest-catalog/{routes,writeRepository}.ts`, `apps/web/app/forge/page.tsx` |
| AI generation/refinement | Done (generation only; refinement — "more epic"/"shorter"/tone change — explicitly deferred, see limitations) | `apps/api/src/modules/generation/`, job-ID/polling pattern per Section 38 |
| Provenance | Partial — `verification_checks` records what was actually checked and against what; per-field `SourceRecord`-style provenance for AI-authored content is not yet populated (nothing calls a real AI provider yet to have provenance to record) | `apps/api/src/db/migrations/0006_feasibility.sql` |
| Feasibility jobs | Done — deterministic rule-based evaluator, run synchronously at submit time (ADR-009) | `apps/api/src/modules/feasibility/` |
| Tier calculation | Done — spec's exact Section 11 weights, provisional equal-width thresholds pending DL-006 | `apps/api/src/modules/tiering/calculateTier.ts` |
| Moderation submission | Done (minimal loop: case opens on submit, a moderator/admin can approve or request changes) — not the full admin console (Gate 6) | `apps/api/src/modules/moderation/` |
| Failure fallbacks | Done — AI failure preserves the idea text and confidence, forcing the manual editor path; a blocked/low-confidence submission returns to `needs_correction` with specific blockers/warnings rather than a generic failure | `apps/web/app/forge/page.tsx`, `evaluateFeasibility` |

## Why the feasibility evaluator doesn't call AI

Section 14.4 describes an AI-assisted feasibility evaluator, but QB-064 is
explicit that it "may not mark a quest feasible solely because the prose
sounds plausible." This gate's evaluator is a deterministic rule engine over
the quest's own structured fields (core fields present, a completion method
exists, safety notes exist when risk warrants them, accessibility has been
assessed at all, age classification matches the guild's own gating flag,
etc.) — it never asks a model "does this seem feasible." That's a
legitimate, spec-compliant first implementation, not a placeholder: the
*additional* checks Section 15 lists (live hours, closures, recent reports)
genuinely require a configured Places provider and are correctly out of
scope until the Gate 0 licensing questions are resolved. Wiring an AI call
into feasibility later should **add** evidence-citing checks on top of this
rule engine, not replace it.

## Files changed

New:

- Migrations `0006_feasibility.sql`, `0007_generation_jobs.sql`,
  `0008_moderation_foundation.sql` (adds `users.creator_trust`)
- `apps/api/src/modules/tiering/calculateTier.ts`
- `apps/api/src/modules/feasibility/{types,service,repository}.ts`
- `apps/api/src/modules/generation/{repository,routes}.ts`
- `apps/api/src/modules/moderation/{repository,routes}.ts`
- `apps/api/src/modules/quest-catalog/writeRepository.ts`; rewrote
  `apps/api/src/modules/quest-catalog/routes.ts` to add create/edit/submit/
  publish/mine alongside the existing read endpoint
- Permission tuples added for `adventurer`/`creator`/`moderator`/`admin` in
  `apps/api/src/modules/identity/permissions.ts`
- `apps/api/tests/{calculateTier,feasibility,questForge.integration}.test.ts`
- `apps/web/lib/apiClient.ts` (browser-side, session-cookie-aware client —
  distinct from `lib/api.ts`'s server-to-server reads)
- `apps/web/app/{login,register,forge,my-quests}/page.tsx`

Wired into `apps/api/src/app.ts`: `/api/v1/ai/*`, `/api/v1/moderation/*`.

## Migrations

7. `0006_feasibility.sql` — `verification_checks`, `feasibility_assessments`.
8. `0007_generation_jobs.sql` — `generation_jobs` (job-ID/polling pattern).
9. `0008_moderation_foundation.sql` — `moderation_cases`,
   `users.creator_trust` (manually set only — no self-service path yet).

## The quest publication flow, end to end

`POST /quests` (draft) → `PATCH /quests/:id` (edit while draft/
needs_correction) → `POST /quests/:id/submit` (runs `evaluateFeasibility`,
persists the assessment, then: low/critical confidence → `needs_correction`
with blockers/warnings returned to the client; medium/high confidence and
`creator_trust` or admin → `approved` directly; medium/high confidence and
untrusted → `submitted` + a `moderation_cases` row) → (untrusted path only)
`POST /moderation/cases/:id/decide` by a moderator/admin → `approved` or
back to `needs_correction` → `POST /quests/:id/publish` (owner or admin,
only from `approved`) → now visible via `/discovery/list` and
`GET /quests/:id`.

Ownership is checked explicitly against `quests.owner_id` in every write
route, separate from the coarse `(action, entity, access)` role check —
the role check answers "can an adventurer create/edit/submit/publish a
quest at all," the ownership check answers "is it *their* quest," matching
the two-layer design implied by `access: 'own'` in ADR-008.

## Tests and results

```
Test Files  6 passed | 5 skipped (11)
     Tests  33 passed | 26 skipped (59)
```

New this gate: `calculateTier.test.ts` (8 tests, pure) and
`feasibility.test.ts` (9 tests, pure) — both fully verified with no
infrastructure, since they're pure functions. `questForge.integration.test.ts`
(9 tests) covers the full flow above: tier computed correctly, out-of-range
factor scores rejected, untrusted submission → moderation case → admin
decide → publish, incomplete submission → `needs_correction` with no
moderation case, ownership enforcement (a stranger gets 403 on edit/submit),
trusted-creator auto-approval, and the guest one-generation limit.

**Verification method for the DB-dependent code this gate**: same Docker/
native-Postgres limitation as Gates 2-3. Given this gate's write path has
the most complex parameter/column bookkeeping yet (a 24-column dynamic
INSERT/UPDATE builder in `writeRepository.ts`), I manually traced every
column against its positional parameter before considering it done — see
the inline reasoning was done at authoring time, not asserted after the
fact. **This is still not a substitute for running it — please do the
manual verification below.**

## Manual verification steps

1. `docker-compose up -d postgres redis && npm run db:migrate && npm run db:seed`
2. `npm run dev:api` and `npm run dev:web`
3. Visit `http://localhost:3000/register`, create an account.
4. Go to `/forge`, type an idea, click "Generate a draft" — confirm it
   fills in title/objectives and shows confidence "critical_unknown" (no AI
   provider is configured, so this is the expected honest result).
5. Fill in the rest of the form (guild, factor scores, risk, accessibility,
   at least one objective) and "Save draft" — note the computed tier.
6. Click "Submit for review" — as a brand-new (untrusted) account, expect
   status `submitted` and a moderation-case message.
7. To see the trusted/admin paths, manually flip a row:
   `docker exec -it questboard_postgres psql -U questboard -c "UPDATE users SET creator_trust = true WHERE username = 'yourname';"`
   then repeat steps 3-6 — submission should go straight to `approved`,
   and a "Publish" button should appear.
8. After publishing, visit `/quests/<id>` and confirm it also now appears
   on `/discover`.
9. Visit `/my-quests` to see the status list.

## Accessibility / security / privacy review

- **Accessibility:** the Forge form uses real `<label>`/`<fieldset>`/
  `<legend>` associations throughout (including the 9 factor-score inputs
  and 5 accessibility selects), and the accessibility selects default to
  "Unknown" rather than a false-positive default — the UI itself models
  Principle 10, not just the API.
- **Security:** every write route re-checks ownership server-side (never
  trusts a client-supplied owner ID); the moderation decide endpoint is
  permission-gated and a non-admin gets a 403 (tested explicitly);
  factor scores are range/integer-validated both by Zod and by
  `validateFactorScores` before being used in the tier calculation, so a
  malformed score can't skew a public-facing tier label. The guest
  AI-generation limit is enforced server-side via the session (Redis-backed,
  `httpOnly` cookie), not a client-side check that could be bypassed by
  calling the API directly.
- **Privacy:** nothing new here retains additional personal data beyond
  what Gate 2 already covers (account + role data) — quest drafts belong to
  the creator and aren't visible to anyone else until published, matching
  the `publication_scope` default of `private`.

## API and AI cost implications

Still zero — `StubAiProvider` is what runs in this environment
(`AI_PROVIDER_API_KEY` unset), so every Quest Forge call returns
immediately with no billed request. The job/polling architecture is real
and ready for a configured provider, but nothing calls out to one yet.

## Known limitations

- **Quest Forge refinement ("more epic," "shorter," "clearer," tone
  change, lock fields, compare variants — Section 14.1) is not
  implemented.** Only initial generation exists. This is a real gap against
  the spec, not an oversight being hidden — it's a contained, additive
  follow-up once basic generation is confirmed working end to end.
- **No version forking on edit.** ADR-007 says editing a published quest
  with existing attempts should create a new `QuestVersion`; since Attempts
  don't exist until Gate 5, there's nothing yet that could make forking
  observable, so `PATCH` always mutates in place. This will need real
  attention at Gate 5, not before.
- **`creator_trust` has no self-service path** — it's a manually-set
  database column standing in for the real `CreatorProfile`/
  `ReputationEvent` trust-tier system (Gate 6). Fine for proving the
  Gate 4 architecture; not a usable trust system yet.
- **The moderation loop is intentionally minimal** — one decide endpoint,
  two outcomes (`approve`/`request_changes`), no queue-listing UI, no
  appeals, no reason-code taxonomy beyond a free-text field. The full admin
  console is explicitly Gate 6 scope.
- **Places/AI providers are still unconfigured** in this environment (same
  as Gates 2-3) — the feasibility evaluator's `location_specified` check
  only verifies a place is *attached*, not that it's real, open, or legally
  accessible (Section 15's live-data checks are correctly out of scope
  until a Places key exists).
- **Web Forge UI takes one primary place at most** (no multi-stop route
  builder yet — that's Section 17 / later Gate 3-continuation or Gate 4-plus
  work) and has no image upload.
- Same Docker/native-Postgres verification caveat as every prior gate.

## Deferred work

Quest Forge refinement mode, AI-assisted (not just structural) feasibility
checks once a provider is configured, version forking, the full
CreatorProfile/ReputationEvent trust system, the admin moderation console
and queue UI, multi-stop route building in the editor, and Branch/Hint/
Reward relational child tables for richer quest structures (Section 9).

## Next gate

**Gate 5 — Attempts and Hearth**: quest start/progress/completion, evidence
primitives, XP events, Rainy Day mode, typed inventory, and saved quests.
This is also where version-forking-on-edit (ADR-007) first becomes
observable, since it's the first gate where attempts against a published
quest exist. Per the execution contract, this report is the stop point for
your review before that work starts.
