# Gate 1 — Quest and Attempt State Machines

Per QB-163/164/165: every transition below carries an authorization rule
(`05-role-permission-matrix.md`), a timestamp, an actor ID, a reason code
where applicable, and writes an `AuditEvent`.

## Quest publication state machine

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> AIGenerated: AI (Quest Forge) produces a structured draft
    AIGenerated --> Draft: creator edits by hand
    Draft --> FeasibilityReview: submit (ADR-009 sync gate)
    AIGenerated --> FeasibilityReview: submit
    FeasibilityReview --> NeedsCorrection: low confidence / blocker
    FeasibilityReview --> Submitted: medium+ confidence
    NeedsCorrection --> Draft: creator revises
    Submitted --> Approved: moderator/trust-tier auto-approval
    Submitted --> NeedsCorrection: moderator requests changes
    Approved --> Published: creator/system publishes
    Published --> ConditionsUncertain: recurring feasibility refresh flags a change
    Published --> TemporarilyUnavailable: known short-term closure detected
    Published --> Flagged: user report crosses severity threshold
    ConditionsUncertain --> Published: reverification passes
    TemporarilyUnavailable --> Published: reopens/reverified
    Flagged --> Suspended: moderator decision
    Flagged --> Published: report dismissed
    Suspended --> Published: appeal upheld
    Suspended --> Archived: appeal denied / creator withdraws
    Published --> Archived: creator/admin archive
    Published --> Superseded: new QuestVersion published (ADR-007)
    Archived --> [*]
    Superseded --> [*]
```

Notes:

- **`AIGenerated` is a distinct state from `Draft`** specifically to satisfy
  C-3's resolution (`docs/gate-0/02-contradictions-and-assumptions.md`): it
  marks content that hasn't had a human editing pass yet, which matters for
  moderation prioritization even though both states are equally private/
  unpublished.
- **`FeasibilityReview` is not user-visible as a lingering state** — it's the
  synchronous gate from ADR-009; the `202`/job-id pattern in
  `04-api-contracts.md` means a submitter sees `Submitted` or
  `NeedsCorrection` shortly after, not stuck "in review" indefinitely.
- **Every arrow out of `Published`** other than creator-initiated archive is
  triggered by the recurring feasibility job or the moderation pipeline —
  never by a plain content edit, which instead creates a new `QuestVersion`
  (`Superseded`, ADR-007).
- **New-creator trust gating (QB-162):** for a non-trusted creator, the
  `Submitted → Approved` edge additionally requires a human moderator
  decision rather than auto-approval; this is a policy check inside that
  transition's authorization rule, not a separate state, to avoid an
  explosion of near-duplicate states.

## Attempt state machine

```mermaid
stateDiagram-v2
    [*] --> Saved
    Saved --> Planned: user schedules/commits
    Saved --> Active: user starts immediately
    Planned --> Active: start time reached / user starts
    Active --> Paused: user pauses
    Paused --> Active: user resumes
    Active --> Completed: all required objectives done
    Active --> PartiallyCompleted: user ends early with some progress
    Active --> Abandoned: user abandons (no harsh penalty, QB-102)
    Paused --> Abandoned: abandon while paused
    Active --> Expired: quest time window elapses
    Paused --> Expired: quest time window elapses
    Completed --> Disputed: evidence/report challenge raised
    PartiallyCompleted --> Disputed: evidence/report challenge raised
    Disputed --> Completed: dispute resolved in favor
    Disputed --> PartiallyCompleted: dispute resolved partially
    Disputed --> Abandoned: dispute resolved against
    Completed --> [*]
    PartiallyCompleted --> [*]
    Abandoned --> [*]
    Expired --> [*]
```

Notes:

- **`Abandoned` and `Expired` are both terminal-but-forgiving states**: per
  QB-102, reaching either grants any partial XP the quest rules allow and
  permits a retry attempt to be started fresh — retrying creates a *new*
  `QuestAttempt`, it never reopens a terminal one.
- **`Disputed` can only be entered from a completed-ish state**, not from
  `Active`/`Paused` — an in-progress attempt has nothing to dispute yet; a
  safety report about an in-progress attempt instead goes through the
  `SafetyIncident` path (Section 25) independent of attempt state.
- **Idempotency (ADR-011):** the `Active → Completed` transition is the one
  most likely to be retried by a flaky client (Section 30's offline sync
  requirement) — its handler is keyed by `Idempotency-Key` so a duplicate
  "complete" submission after a dropped connection never double-grants XP.
