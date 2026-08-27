# Gate 1 — AI Service Schemas and Prompt Boundaries

All services below implement the `AiGenerationProvider` interface (ADR-006)
and share the cross-cutting requirements from Section 14: schema-validated
I/O, versioned prompts/models, logged with privacy controls, timeouts/
retries/fallback, cost budgets + per-user rate limits, and — the rule this
section exists to make concrete — **strict separation of factual source
context from creative instructions**, so untrusted external text can never
pose as an instruction.

## The prompt-boundary contract (applies to every service below)

Every call to the underlying model is assembled from three distinct,
separately-typed parts, never string-concatenated into one undifferentiated
block:

1. **System/instruction context** — fixed, versioned, engineer-authored.
   Defines the service's task, output schema, and hard constraints (never
   fabricate hours/prices/accessibility/history; respect the decision
   hierarchy in spec Section 4). This is the *only* part that can instruct
   the model to do anything.
2. **Trusted structured context** — data our own system already verified:
   `ProviderSnapshot` fields, `FeasibilityAssessment` results, the user's
   explicit saved preferences/constraints, session filters. Passed as
   labeled structured fields (e.g. JSON), not prose the model is told to
   "follow."
3. **Untrusted external context** — anything sourced from outside our
   verified pipeline: place reviews, OCR'd flyer/menu text, pasted event
   links, a user's free-text quest idea. Passed in a clearly delimited field
   explicitly labeled as *data to interpret*, never as instructions — mirrors
   Section 39's "external webpages, reviews, menus, flyers, and user text are
   untrusted data. They must never be allowed to override system instructions
   or tool policy," and the AI eval suite (Section 44) includes prompt-
   injection cases specifically to test this boundary holds.

Output is always validated against a Zod schema before it's allowed to reach
`GenerationJob.output_ref`; a schema-validation failure is a `failed` job, not
a best-effort pass-through.

## 14.1 Quest Forge

**Purpose:** turn a plain idea + constraints into a structured, editable
`QuestVersion` draft.

**Input schema (sketch):**
```
{
  ideaText: string,              // untrusted external context
  constraints: {
    time?, budget?, groupSize?, ageRange?, transportMode?,
    accessibilityNeeds?: AccessibilityProfile,  // trusted, from saved profile
  },
  anchorPlace?: { googlePlaceId },  // trusted, from Places adapter
  selectedTone: ToneKey,
  lockedFields?: string[],       // fields the user has locked from regeneration
}
```

**Output schema (sketch):** the full editable field set from Section 14.1 —
epic title, description, objectives[], bonuses[], recommended tier +
`FactorScore` breakdown, time/cost/distance/effort/prep estimates, safety/
accessibility/age/uncertainty notes (each carrying a confidence enum per
ADR-010, never asserted as fact without a source), completion methods[],
reward/XP recommendation, tone, shareable card copy. Every field maps
1:1 onto a `QuestVersion` column/child-table so the draft can be persisted
directly (`03-data-model.md`).

**Refinement mode:** `refine(draftId, instruction: 'more_epic' | 'shorter' |
'clearer' | { newTone } , lockedFields[])` re-runs generation with the prior
output as trusted structured context (not re-derived from scratch) and
respects `lockedFields` by excluding them from the editable output set
entirely — a locked field literally isn't sent back for regeneration.

**Fallback:** on AI failure/timeout, the user's raw `ideaText` and
constraints are preserved and the UI offers the manual structured quest
editor (Section 14 AI requirements: "offline/static fallbacks when AI is
unavailable"; QB-280's error-state requirement).

## 14.2 Conversational guide

**Purpose:** natural-language planning ("find something spooky near Salem
for four adults tonight").

**Input:** current turn text (untrusted), full conversation history for this
session (trusted — it's our own prior turns), session filters (trusted),
explicitly saved user preferences (trusted) — **never** other users' data,
never behavioral history the user hasn't opted into surfacing here (QB-062:
"uses only session information and preferences the user has explicitly
saved").

**Output:** a natural-language response *plus* a structured "assumptions
made" list (e.g., "assuming tonight = before 11pm, adults = 18+") that the
UI renders explicitly, and a structured candidate-quest list or itinerary
reference. Supports `replace_stop(itineraryId, stopIndex)` and
`replace_constraint(key, value)` calls that regenerate only the affected
part (QB-062's "allow individual stops or constraints to be replaced without
regenerating everything").

## 14.3 Nearby generator

**Purpose:** produce on-demand variants (solo/date/family/short/extended/
indoor/outdoor/weather-adapted) of a base quest from verified location data,
without persisting every combination (QB-063).

**Input:** base `QuestVersion` id or `ProviderSnapshot` place reference,
variant axis requested (e.g. `audience: family`), current weather/daylight
context (trusted, from the weather adapter).

**Output:** a variant draft using the same schema as Quest Forge's output,
but explicitly flagged `origin_type: ai_suggested, derived_from:
<baseQuestVersionId>` — variants don't skip the feasibility gate just
because their base quest already passed it, since a variant can change
duration/group-size/accessibility implications materially.

## 14.4 Feasibility evaluator

**Purpose:** the mandatory gate from ADR-009. Deliberately **not** a
creative-writing task — it consumes structured objectives + source data and
returns structured findings only.

**Input:** `QuestVersion` structured fields (objectives, place refs, claimed
hours/cost/access), current `ProviderSnapshot` data for referenced places,
recent `Report`s against the same place/quest, weather/seasonal context.

**Output schema:**
```
{
  checks: VerificationCheck[],      // one row per Section 15 checklist item
  overallConfidence: 'high'|'medium'|'low'|'critical_unknown',
  blockers: string[],
  warnings: string[],
  unknowns: string[],
  recommendedPublicationScope: VisibilityLevel,
}
```

**Hard constraint (QB-064):** the model is never asked "is this feasible?" as
an open creative question — the prompt requires it to justify every
`pass`/`warning`/`blocker` against a specific piece of trusted structured
context (a `ProviderSnapshot` field, a `Report`, a stated objective) or mark
`unknown`. A confidence output with no corresponding check evidence fails
schema validation (the schema requires each check to cite what it checked
against).

## 14.5 Supporting AI services

- **Moderation/adult-content classification** — input: quest/comment/review
  text + images; output: category flags + confidence, feeding
  `ModerationCase` creation. Runs on every `Submitted` transition and on user
  reports.
- **Duplicate/similarity detection** — input: candidate `QuestVersion` +
  nearby existing versions at the same place; output: similarity score +
  suggested merge vs. distinct (per Section 23's "preserve distinct quests
  when audience/story/objectives/accessibility/structure differ materially").
- **Translation/localization** — Release 2 scope (Section 35); interface
  reserved now, not implemented.
- **Inventory/image extraction** — input: photo (untrusted); output:
  *proposed* `InventoryItem` candidates requiring explicit user confirmation
  before persisting (QB-081) — this output is never auto-committed.
- **Recommendation candidate generation** — feeds the Discovery ranker
  (`04-api-contracts.md`) with candidate quests beyond simple SQL filtering;
  runs *before* the hard-constraint filter in Section 12's ranking order, so
  its output is always re-filtered by the same legality/age/safety/
  accessibility gate as everything else — it has no special bypass.
- **Factual-claim extraction/citation mapping** — input: narrated quest
  description; output: `FactualClaim` rows distinguishing asserted history/
  facts (needing a citation) from narrative flavor (QB-074).

## Cost and rate-limit posture (pending DL-008 numbers)

Every service call is metered against a per-user daily quota and a global
per-quest-generation cost ceiling; when a quota is hit, the UI falls back to
the manual quest editor / plain search rather than silently degrading output
quality. Actual numeric limits are a Gate 2 configuration exercise once
DL-008 is answered — this document fixes the *mechanism*, not the numbers.
