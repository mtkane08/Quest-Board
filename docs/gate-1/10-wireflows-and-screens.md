# Gate 1 — Wireflows and Screen/State Inventory

## Screen inventory (Section 46, traced as QB-301)

Grouped by primary nav section (Section 7) plus cross-cutting/admin screens.

**Home / The Board** — Welcome/onboarding + permission education, Guest/
personalized home board, Notifications.

**Map / The Realm** — Map/list explorer, Search and filter sheet, Region/fog
progress (R1.1).

**Quest lifecycle (reachable from Board, Map, or Forge)** — Quest detail +
spoiler preview, Start/preflight checklist, Active quest/navigation/
checkpoints, Pause/abandon/complete + evidence, Completion summary/rating.

**Forge** — Conversational guide, Structured Forge editor + version history,
Submission/moderation status.

**Hearth** — Hearth generator and inventory.

**Profile / Chronicle** — Chronicle/profile/progression, Saved collections
and campaigns, Party creation/invitation/progress, Privacy/accessibility/age/
theme/permissions settings, Creator/business/organization pages (Release 2,
stub only in R1).

**Admin** — Moderation/report/incident/readiness dashboards.

Every screen above needs the full state set from Section 42 (loading, empty,
error, partial-data, offline, permission-denied, age-blocked, location-
unavailable, no-results, provider-degraded, stale-data) — QB-280. The flows
below call out the specific states that matter most per screen rather than
repeating the full list each time.

## Flow 1: First open → first quest start (guest)

```mermaid
flowchart TD
    A["App opens"] --> B{"Location permission?"}
    B -- granted --> C["Home board: personalized-by-location feed\n+ intent prompt + Map/Hearth shortcuts"]
    B -- denied --> D["Home board: manual city/ZIP fallback\n(QB-042 state: location-unavailable)"]
    C --> E["Tap a quest card"]
    D --> E
    E --> F["Quest detail: safety/cost/time/accessibility\nvisible before starting (QB-031)"]
    F --> G["Preflight checklist screen"]
    G --> H{"Guest-eligible quest?"}
    H -- yes --> I["Active quest screen"]
    H -- no --> J["Prompt: create account\n(persistence/social/rewards require identity, QB-001)"]
    J --> K["Register/login"] --> I
    I --> L["Complete / Pause / Abandon"]
    L --> M["Completion summary + rating (if completed)"]
```

## Flow 2: Quest Forge — idea to submission

```mermaid
flowchart TD
    A["Forge: plain idea input\n(or conversational guide)"] --> B["POST /ai/quest-forge\n(202 + job id)"]
    B --> C["Job polling UI\n(<15s typical target, Section 40)"]
    C --> D{"Job result"}
    D -- succeeded --> E["Structured Forge editor:\nall fields editable, lock/compare/tone controls"]
    D -- failed/timeout --> F["Fallback: manual quest editor\nwith original idea text preserved (QB-280)"]
    E --> G["Submit"]
    F --> G
    G --> H["Feasibility gate (ADR-009, sync-feeling but job-backed)"]
    H --> I{"Confidence"}
    I -- medium+ --> J["Submitted → moderation queue\n(or auto-approve if trusted creator)"]
    I -- low/blocker --> K["Needs Correction:\nspecific blockers/warnings shown"]
    K --> E
    J --> L["Submission/moderation status screen"]
```

## Flow 3: Party invite and shared quest

```mermaid
flowchart TD
    A["User creates party from quest detail"] --> B["Invite link generated"]
    B --> C["Invitee opens link"]
    C --> D{"Has account?"}
    D -- no --> E["Register/login\n(party join requires account, Section 6)"]
    D -- yes --> F["Join party"]
    E --> F
    F --> G["Party roster + shared quest view"]
    G --> H["Temporary location share\n(opt-in, expires with quest, Section 26)"]
    H --> I["Party progress screen during active quest"]
```

## Flow 4: Moderation queue (admin/moderator)

```mermaid
flowchart TD
    A["Admin console: moderation queue"] --> B["Item: Submitted quest\nor user Report"]
    B --> C["Review detail:\nfeasibility findings, provenance, creator trust tier"]
    C --> D{"Decision"}
    D -- approve --> E["Quest → Approved/Published"]
    D -- request changes --> F["Quest → Needs Correction\n(reason code required, QB-165)"]
    D -- suspend/reject --> G["Quest → Suspended/Archived\n+ AuditEvent + notify creator"]
    B --> H["High-severity report?"]
    H -- yes --> I["Immediate suppression pending review\n(Section 25)"]
    I --> C
```

## Cross-cutting UI rule

Every quest card and map pin (Section 45) surfaces: title + one-line summary,
tier + key factor labels, time/cost/distance/open-state, tags, accessibility/
adult/safety indicators where material, origin/trust/confidence badge,
save/start action, and sponsor disclosure when applicable. This card spec is
shared across the Home feed, Map, Search results, and the accessible list
view — one component, not four near-duplicates, so a11y and trust-badge
correctness only has to be verified once.
