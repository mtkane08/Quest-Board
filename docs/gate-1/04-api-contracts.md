# Gate 1 — API Contracts

## Conventions (apply to every group below)

- **Versioning:** `/api/v1/...`. Breaking changes ship as `/api/v2/...`
  alongside v1 until clients migrate — never an in-place breaking change.
- **Auth:** Bearer session token (cookie-based for the web PWA, per Section
  36's BFF pattern) for authenticated calls; unauthenticated calls are
  explicitly allow-listed per Section 6's guest capabilities (QB-001).
- **Authorization:** every handler declares the `(action, entity, access)`
  tuple it requires (ADR-008) and checks it against the caller's active
  `RoleGrant`s before touching data — not left to ad hoc `if` checks per
  route.
- **Validation:** Zod schema per request/response shape (ADR-006 for AI
  payloads specifically, but this applies to all endpoints per Section 38).
- **Pagination:** cursor-based (`?cursor=...&limit=...`) for list endpoints,
  not offset-based, since map/feed results are frequently re-ranked between
  requests.
- **Idempotency:** `Idempotency-Key` header required on reward/evidence/
  invitation/state-transition mutations (ADR-011); server returns the
  original response on a replayed key.
- **Errors:** `{ error: { code, message, details? } }` with a stable string
  `code` (e.g. `FEASIBILITY_BLOCKED`, `AGE_RESTRICTED`,
  `ACCESSIBILITY_UNKNOWN_FILTER_MISMATCH`) — codes are part of the contract,
  not just the message text, so clients can branch on them (e.g., to render
  QB-280's specific failure states).
- **Rate limits:** per-endpoint-group limits, strictest on auth and AI
  generation endpoints (mirrors this workspace's own Express rate-limiting
  convention, applied fresh here rather than copied).
- **Long-running work:** AI generation and feasibility jobs return
  `202 Accepted` with a `job_id`; client polls `GET /jobs/{id}` or subscribes
  to a status channel — never a synchronous multi-second AI call on the
  request thread (Section 38).

## Groups (Section 38) and representative endpoints

### Auth, profile, consent, role switching
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `POST /auth/guest-session` — issues a scoped guest session (no account)
- `GET /me`, `PATCH /me/profile`
- `POST /me/consent` — records a `Consent` row per type/version
- `POST /me/roles/{roleGrantId}/activate` — switches active role for session

### Preferences, accessibility, privacy, inventories
- `GET/PATCH /me/preferences` (lightweight profile, Section 12)
- `GET/PATCH /me/accessibility-profile` (Section 27 categories; private by
  default, never returned in any public-facing profile response)
- `GET/PATCH /me/privacy-settings`
- `GET/POST/PATCH/DELETE /me/inventory`, `POST /me/inventory/extract-from-image`
  (returns *proposed* items requiring `POST /me/inventory/confirm` before
  persisting — QB-081)

### Quest discovery / search / map viewport
- `GET /discovery/feed` — personalized/guest home feed
- `GET /discovery/map?bbox=...&filters=...` — viewport query, returns
  clustered pins; identical filter set available at
- `GET /discovery/list?filters=...` — the accessible list-equivalent
  (Section 8, 45) — same ranking, no map required
- `GET /discovery/search?q=...`
- `POST /discovery/surprise-me`

### Quest read/create/edit/version/submit/publish/archive
- `GET /quests/{id}` — resolves to current published `QuestVersion` (or a
  specific `?version=` for attempt-pinned reads, ADR-007)
- `POST /quests` (draft), `PATCH /quests/{id}` (mutates draft, or forks a new
  version per ADR-007 if the current version has attempts)
- `POST /quests/{id}/submit` — triggers the synchronous feasibility gate
  (ADR-009); `202` with a job id, client polls for the `Approved` /
  `Needs Correction` outcome
- `POST /quests/{id}/publish`, `POST /quests/{id}/archive`
- `GET /quests/{id}/versions` — version history

### AI generation/refinement/conversation
- `POST /ai/quest-forge` — body: plain idea + constraints; `202` + job id
- `GET /ai/jobs/{id}` — resumable status (Section 38)
- `POST /ai/quest-forge/{draftId}/refine` — "more epic," "shorter," tone
  change, lock specific fields
- `POST /ai/conversation` — conversational guide turn; body includes only
  session context + explicitly saved preferences (QB-062), never raw
  cross-user data
- `POST /ai/nearby-variants` — generate variant view of a base quest
  (solo/date/family/etc., QB-063) without persisting every combination

### Feasibility and source/provenance
- `GET /quests/{id}/feasibility` — current `FeasibilityAssessment` +
  `VerificationCheck` list
- `GET /quests/{id}/provenance` — per-field `SourceRecord` trail
- `POST /admin/feasibility/{questVersionId}/reassess` (admin/mod only)

### Attempts, objective progress, evidence, completion
- `POST /attempts` (from a quest version), `PATCH /attempts/{id}` (pause/
  resume/abandon)
- `POST /attempts/{id}/objectives/{objectiveId}/complete`
- `POST /attempts/{id}/evidence` (signed upload URL flow — see Security notes)
- `POST /attempts/{id}/complete` — idempotency-key required (ADR-011)

### Parties, invitations, temporary sharing
- `POST /parties`, `POST /parties/{id}/invitations`
- `POST /invitations/{code}/accept`
- `POST /parties/{id}/location-share/start` /
  `POST /parties/{id}/location-share/stop` — hard-expires with the attempt
  (Section 26)

### Ratings, reviews, reports, appeals
- `POST /attempts/{id}/rating` (the 4 scores, Section 23)
- `POST /reports` (target type/id, category, severity)
- `POST /reports/{id}/appeal`

### Progression, regions, fog sessions
- `GET /me/progression` (XP, level, rank, badges, skills)
- `POST /exploration/sessions/start` / `.../stop` (R1.1)
- `GET /exploration/regions/progress` (R1.1)

### Moderation/admin
- `GET /admin/moderation/queue`, `POST /admin/moderation/{caseId}/decide`
- `POST /admin/quests/{id}/suspend`
- `GET /admin/reports`, `POST /admin/reports/{id}/resolve`
- `GET /admin/audit?entity=...&actor=...`

### Organizations, claims, sponsorships (Release 2 — routes reserved, not implemented)
- Schema-only per `03-data-model.md`; no routes ship in R1/1.1.

### Notifications
- `GET/PATCH /me/notification-preferences`
- `GET /me/notifications`, `POST /me/notifications/{id}/read`

### Taxonomy/configuration/feature flags
- `GET /taxonomy/realms`, `/guilds`, `/tags`, `/themes`, `/tones` (public read)
- `GET/PATCH /admin/taxonomy/*` (admin write, no-deploy editing per QB-020)
- `GET /feature-flags` (client-relevant flags only, evaluated server-side)

## Security notes specific to the API layer

- **Evidence/media uploads** use short-lived signed upload URLs directly to
  object storage (per Section 39's "signed short-lived uploads"), not
  proxied through the API as a raw multipart body — the API only records the
  resulting `storage_ref` after a server-side scan/EXIF-strip step confirms
  the object.
- **External text inputs** (flyer/menu photo OCR text, pasted event links,
  place review snippets used as AI context) are always passed to the AI
  provider adapter in a clearly separate "untrusted context" field, never
  concatenated into the instruction/system prompt string (Section 39, 14;
  mirrors this session's own instruction-source-boundary rule).
- **Viewport/search endpoints** are rate-limited more generously than
  mutation endpoints but still capped, since unbounded map-tile scraping is
  both a cost risk (Google Places billing) and a scraping/abuse vector.
