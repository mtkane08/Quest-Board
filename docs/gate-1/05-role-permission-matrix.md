# Gate 1 — Role / Permission Matrix

Implements ADR-008: permissions are `(action, entity, access)` tuples, where
`access` is `own` (the actor's own resource, or their household/party/
organization's) or `any` (platform-wide). A role is a named bundle of tuples;
`RoleGrant` attaches a role to a user, optionally scoped to a household,
organization, or business (Section 6).

Legend: ✅ = `any`, 🟡 = `own` only, — = no access (request is rejected with
`403`, distinct from a hard-blocked action which returns a specific error
code like `AGE_RESTRICTED`).

| Action → Entity | Guest | Adventurer (User) | Guardian | Child Profile | Creator | Business/Venue Mgr | Org/Tourism Mgr | Trusted Reviewer/Mod | Admin |
|---|---|---|---|---|---|---|---|---|---|
| view, quest (published, age-appropriate) | ✅ | ✅ | ✅ | ✅ (filtered, QB-181) | ✅ | ✅ | ✅ | ✅ | ✅ |
| view, quest (adult/age-restricted) | — | ✅* | ✅* | — (hard block) | ✅* | ✅* | ✅* | ✅ | ✅ |
| create, quest (draft) | — (1 limited private AI quest only, QB-001) | 🟡 | 🟡 (on own or child's behalf, with review) | — | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| edit, quest | — | 🟡 | 🟡 | — | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| submit, quest (for review) | — | 🟡 | 🟡 | — | 🟡 (subject to trust-tier review, QB-162) | 🟡 | 🟡 | 🟡 | ✅ |
| publish, quest | — | — | — | — | 🟡 (only once trusted, else routes to moderation) | 🟡 (once venue verified) | 🟡 (once verified) | ✅ | ✅ |
| suspend, quest | — | — | — | — | — | — | — | ✅ | ✅ |
| start, attempt | ✅ (guest-eligible quests only) | ✅ | ✅ (on own or supervised child's behalf) | ✅ (age-appropriate only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| submit, evidence | ✅ (guest attempts) | 🟡 | 🟡 | 🟡 (subject to child-safety limits on photo evidence, QB-181) | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| create, party | — (account required, Section 6) | 🟡 | 🟡 | — (guardian-mediated only) | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| invite, party-member | — | 🟡 | 🟡 | — | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| create, scheduled-public-event | — | — | — | — | 🟡 (once trusted, MVP-restricted per QB-133) | 🟡 (once verified) | 🟡 (once verified) | ✅ | ✅ |
| submit, rating/review | — | 🟡 | 🟡 | 🟡 (private-by-default per QB-181) | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| submit, report | ✅ | ✅ | ✅ | ✅ (routed to guardian + moderation) | ✅ | ✅ | ✅ | ✅ | ✅ |
| moderate, report | — | — | — | — | — | — | — | ✅ | ✅ |
| decide, moderation-case | — | — | — | — | — | — | — | ✅ (bounded categories) | ✅ |
| suspend, trusted-status | — | — | — | — | — | — | — | — | ✅ |
| claim, venue | — | — | — | — | — | 🟡 (pending verification) | 🟡 (pending verification) | — | ✅ |
| verify, venue-claim | — | — | — | — | — | — | — | — | ✅ |
| view, accessibility-profile (own) | ✅ | ✅ | ✅ (own + managed child) | ✅ (own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| view, accessibility-profile (other user) | — | — | — | — | — | — | — | — | — (never — private data, Section 27, no admin override in matrix) |
| export/erase, own-data | — (no account) | 🟡 | 🟡 (own + managed child, with legal retention limits) | — (guardian-mediated) | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| view, admin-console | — | — | — | — | — | — | — | 🟡 (moderation surfaces only) | ✅ |
| edit, taxonomy | — | — | — | — | — | — | — | — | ✅ |
| view, audit-log | — | — | — | — | — | — | — | 🟡 (own moderation actions) | ✅ |

`*` = subject to jurisdiction-specific legal age threshold (DL-002) checked
server-side on every request path, not just at signup — this is the hard
gate from Section 12's ranking order ("filter hard constraints first:
legality, age...").

## Notes

- **Child Profile is never an independent bearer of write permissions** to
  anything social, public, or age-restricted — every write path either
  routes through the guardian or is hard-blocked, per Section 26's "parent
  approval required for public events/stranger groups involving minors."
- **Business/Org/Tourism manager roles carry no permissions at all until
  `Verification` exists and is approved** (Release 2 per Gate 0 resolution),
  even though the role *type* exists in the identity model from Release 1 —
  this keeps the identity/role schema future-proof (Section 6) without
  exposing unbuilt business functionality.
- **Trusted Reviewer/Moderator is a bounded role**: it can decide moderation
  cases and view moderation-relevant admin surfaces, but cannot edit taxonomy
  or view another user's private accessibility profile — full platform
  authority is Admin-only, matching Section 41's MVP admin scope ("essential
  moderation, reports, quest suspension, verification, and audit functions
  first").
- **No role, including Admin, gets a blanket `view, accessibility-profile
  (other user)` permission** — this is intentionally not represented as ✅
  anywhere in the matrix, because accessibility data is private per Section
  27 with no stated moderation exception in the spec. If a moderation
  scenario genuinely needs it (e.g., investigating a false-accessibility-claim
  report), that should be a narrow, audited, report-scoped exception added
  explicitly at Gate 6 — not a standing permission.
