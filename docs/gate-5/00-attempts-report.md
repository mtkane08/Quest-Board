# Gate 5 — Attempts and Hearth: Milestone Report

Per Section 47's per-milestone reporting requirement.

## Requirements completed

Gate 5's scope per Section 47 is quest start/progress/completion, evidence
primitives, XP events, Rainy Day mode, typed inventory, and saved quests.

| Item | Status | Where |
|---|---|---|
| Quest start/progress/completion | Done — full attempt state machine subset (active/paused/completed/partially_completed/abandoned) | `apps/api/src/modules/attempts/`, `apps/web/app/attempts/[id]/page.tsx` |
| Evidence primitives | Done for `honor_system`/`gps`/`answer`/etc. as typed records; no binary upload pipeline (S3 unconfigured, same as every prior gate) | `apps/api/src/db/migrations/0009_attempts.sql`, evidence routes |
| XP events | Done — append-only ledger, diminishing-returns anti-farming, tier-derived base reward | `apps/api/src/modules/progression/reward.ts` |
| Rainy Day / Hearth mode | Done — typed inventory is genuinely new this gate; Hearth *quest listing* already existed since Gate 3's guild filter | `apps/api/src/modules/hearth/`, `apps/web/app/hearth/page.tsx` |
| Typed inventory | Done — add/list/edit/delete/export | `apps/api/src/modules/hearth/routes.ts` |
| Saved quests | Done — pulled forward from the data model's Gate-6-adjacent grouping because Section 47 explicitly lists it under Gate 5 | `apps/api/src/modules/quest-catalog/routes.ts` (`/saved`, `/:id/save`) |

Also delivered, because Section 19 requires them alongside XP: level/rank
(derived, not stored — see below), badges (a small real catalog, not a
placeholder), and streaks (derived from completion history, which is itself
how "no punitive streak loss" is enforced structurally rather than by
policy).

## Design choice: level, rank, and streak are computed, not stored

`docs/gate-1/03-data-model.md` already flagged Level/Rank as
"derived/config-driven thresholds over cumulative XP." This gate takes that
literally: there is no `levels` or `streaks` table anywhere. A user's level,
rank, and current streak are always calculated fresh from the `xp_events`
ledger and `quest_attempts.completed_at` history
(`apps/api/src/modules/progression/{leveling,streak}.ts`). This means there
is no "reset the streak counter" code path to accidentally make punitive —
missing a day simply stops the count from continuing; it can't be *decremented*
because nothing is stored to decrement. The tradeoff is a slightly heavier
read query at request time instead of a write-time counter; at this data
volume that's the right side of the tradeoff.

## Design choice: two different "prior engagement" counts

Anti-farming (diminishing XP on repeat attempts) counts **any** prior
`completed` or `partially_completed` attempt of the same quest. Badge
progress (`first_completion`, `five_completions`, ...) counts **only**
`completed` attempts. This is deliberate, not an inconsistency: a partial
attempt is still "you've engaged with this quest before" for reward-farming
purposes, but shouldn't count toward a badge that's explicitly about full
completions. Both are exercised by
`attempts.integration.test.ts`'s two-attempt scenario.

## Files changed

New:

- Migrations `0009_attempts.sql`, `0010_progression.sql`,
  `0011_hearth_and_saved.sql`
- `apps/api/src/modules/progression/{reward,leveling,badges,streak,routes}.ts`
- `apps/api/src/modules/attempts/{repository,routes}.ts`
- `apps/api/src/modules/hearth/routes.ts`
- `apps/api/src/modules/quest-catalog/routes.ts` — added `/saved`,
  `/:id/save` (POST/DELETE)
- `apps/api/tests/{progression,attempts.integration}.test.ts`
- `apps/web/app/{attempts/[id],profile,hearth}/page.tsx`
- `apps/web/components/QuestActions.tsx` (start/save buttons on the quest
  detail page)
- Extended `apps/web/lib/apiClient.ts` with attempts/progression/hearth/
  saved-quest calls

Wired into `apps/api/src/app.ts`: `/api/v1/attempts/*`,
`/api/v1/progression/*`, `/api/v1/hearth/*`.

## Migrations

10. `0009_attempts.sql` — `quest_attempts`, `attempt_objectives`,
    `evidence`, `completion_decisions`. Attempts require an account
    (`user_id NOT NULL`) — see known limitations.
11. `0010_progression.sql` — `xp_events` (append-only), `user_badges`. No
    `levels`/`streaks` tables, per the design choice above.
12. `0011_hearth_and_saved.sql` — `inventory_items` (user-scoped, not
    household-scoped yet), `saved_quests`.

## Tests and results

```
Test Files  7 passed | 6 skipped (13)
     Tests  49 passed | 34 skipped (83)
```

New this gate: `progression.test.ts` (16 tests, pure — reward calculation,
diminishing returns, leveling thresholds, badge crossing logic, and streak
math including the "no punitive loss" and "same-day dedup" cases) and
`attempts.integration.test.ts` (8 tests) covering the full start → evidence
→ partial-complete → repeat → full-complete flow with real diminishing XP
and badge awarding, pause/resume/invalid-transition rejection, the 404-not-403
privacy choice for another user's attempt, evidence-objective ownership
validation, and Hearth inventory + saved-quest CRUD including cross-user
protection.

**A concrete bug this caught before it could hide behind "no DB to run
it against":** my first draft of the diminishing-XP test asserted a
hardcoded XP value based on an assumption about which tier a uniform
factor-score-of-2 draft would land in. Recomputing it by hand against
`calculateTier`'s actual thresholds (weighted mean 2.0 → "adventurer", not
"novice") showed the assertion was wrong, not the implementation — fixed
before it could ever pass or fail for the wrong reason. This is exactly the
kind of error that a real test run would have caught immediately; absent
that, doing the arithmetic by hand was the substitute, same as prior gates'
manual SQL tracing.

**Verification method for the DB-dependent code this gate**: same Docker/
native-Postgres limitation as every prior gate — please run the manual
verification steps below.

## Manual verification steps

1. `docker-compose up -d postgres redis && npm run db:migrate && npm run db:seed`
2. `npm run dev:api` and `npm run dev:web`
3. Register an account, go to `/discover`, open a quest, click "Start quest."
4. On `/attempts/<id>`, check off an objective (records honor-system
   evidence), then "Complete" — confirm XP and (on your first-ever full
   completion) a "first_completion" badge appear.
5. Visit `/profile` — confirm level/rank/streak/badges/saved quests render.
6. Go back to a quest detail page and click "Save for later" — confirm it
   now appears on `/profile`.
7. Visit `/hearth`, add a pantry item, confirm it lists/deletes correctly;
   click through to Hearth & Home quests and confirm the guild filter still
   works (this part is unchanged from Gate 3).
8. Start a second attempt of the *same* quest and complete it fully —
   confirm the XP awarded is visibly less than double the first attempt's
   (diminishing returns).

## Accessibility / security / privacy review

- **Accessibility:** the attempt page uses real checkboxes with associated
  text (not icon-only buttons) for objective completion, and disables
  interaction with clear reasoning (`disabled` + visual state) rather than
  hiding controls, so screen-reader users get consistent state
  announcements rather than a control disappearing unexpectedly.
- **Security:** every attempt/evidence/inventory route re-validates
  ownership server-side; a stranger accessing another user's attempt gets a
  404 (existence hidden), not a 403 (existence confirmed but denied) —
  deliberately the more private choice, tested explicitly. Evidence
  `objectiveId` is validated against the attempt's own objective list
  before being accepted, closing a real (if low-severity) data-integrity
  gap a naive FK-only check would have missed.
- **Privacy:** inventory items are tagged `data_class = 'home_inventory'`
  per ADR-012, ready for the future export/erase job; nothing here expands
  the personal-data footprint beyond what the privacy/retention matrix
  already accounted for (Gate 1, `docs/gate-1/08-privacy-retention-matrix.md`
  already has an "Inventory" row).

## API and AI cost implications

None — this gate touches no external provider at all (no Places, no AI).

## Known limitations

- **Attempts require an account.** Section 6 says an account is required to
  "earn durable rewards," which XP clearly is, but acceptance scenario 10
  ("a user denies GPS and can still browse, plan, and honor-complete
  eligible quests") arguably implies a guest can *complete* something. This
  gate takes the more conservative, unambiguous reading (durable XP = needs
  an account = no guest attempts at all) rather than building a parallel
  ephemeral-attempt system for an edge case the spec doesn't fully resolve.
  Flagging as a real gap, not hiding it.
- **No evidence file upload.** `photo`/`video`/`external` evidence types
  exist in the schema and can be recorded with a text `note`, but there's
  no signed-upload flow to actual object storage — S3 credentials are
  unconfigured in this environment, consistent with every prior gate's
  provider-stub pattern. This is a contained follow-up once storage is
  configured, not an architecture gap (the `Evidence` table's `objective_id`/
  `type`/`note` shape doesn't change when a real `storage_ref` field is
  added).
- **No `Expired` or `Disputed` attempt states implemented.** `Expired`
  needs a quest time-window concept that doesn't exist yet; `Disputed`
  needs the reporting/moderation system (Gate 6). Both are real states in
  the migration's CHECK constraint (so the schema doesn't need to change
  later) but nothing transitions an attempt into them yet.
- **Inventory is per-user, not per-household** even though `households`
  has existed since Gate 2 — Section 16 mentions shared inventory as a
  possibility, but nothing in Gate 5's scope needs it, so the extra
  join/permission logic is deferred rather than speculatively built.
- **Category mastery (Explorer/Culinarian/Scholar/Artisan/Steward, Section
  19) is not implemented** — badges and levels are, but per-guild mastery
  tracking is a reasonable, additive Gate 6+ feature, not attempted here.
- **No "hints" support** even though the spec mentions hints as a Section 9
  quest-structure feature and Section 18 completion option — no quest in
  the seed data or Forge editor collects hint content yet, so there was
  nothing to attach hint-delivery UI to.
- Same Docker/native-Postgres verification caveat as every prior gate.

## Deferred work

Evidence file uploads, guest/ephemeral attempts (if that reading of Section
6 is confirmed correct later), `Expired`/`Disputed` attempt states,
household-shared inventory, category mastery tracking, hints, and any
richer progression UI (a level-up celebration, a public profile view for
other users — Section 21's profile visibility settings don't exist yet
either, correctly deferred to Gate 6's Social module).

## Next gate

**Gate 6 — Community safety**: public publishing, ratings/reports, admin
moderation (the full console, not Gate 4's minimal decide-endpoint),
creator reputation foundation (replacing the manually-set `creator_trust`
column), parties by invitation, age/adult controls, privacy exports/
deletion, and audit tools. Per the execution contract, this report is the
stop point for your review before that work starts.
