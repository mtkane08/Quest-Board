# Gate 0 — Recommended MVP Technical Stack

> **Updated (2026-08-26):** per DL-012, this build is purely spec-driven —
> `questmap` is no longer used as a reference. Recommendations below are
> justified from the spec and general ecosystem fit only.

Section 36 already specifies a logical architecture in fairly concrete terms
("TypeScript mobile-first React framework with SSR + PWA," "PostgreSQL with
PostGIS," "Redis-compatible cache/queue where justified," "modular monolith
unless scale/team boundaries justify services"). This section confirms that
direction with specific choices, alternatives, and decision criteria — Section
36 itself says "Claude must confirm current library versions and vendor
constraints before choosing exact dependencies," which is a live check to do
right before Gate 2 (Foundation), not now.

## Client: Next.js (React, TypeScript)

| Choice | Why | Alternative considered | Why not (yet) |
|---|---|---|---|
| Next.js (App Router) | Satisfies "server rendering + PWA support" directly (Section 36); mature PWA/service-worker tooling | Remix | Both fit the spec's "server-rendering React framework" requirement equally well; Next.js's App Router and first-party PWA/service-worker ecosystem is the more direct fit for the offline-quest-packet requirement (Section 30) |
| Tailwind CSS + a component design system with theme tokens | Matches Section 36's "component design system with theme tokens" and Section 28's theme-swapping requirement (tone changes must not alter underlying facts — theming needs to be a presentation layer, not data) | CSS-in-JS | Tokens are easier to express and swap at build/runtime with Tailwind config + CSS variables for the fantasy/plain theme split |
| Google Maps JavaScript SDK via a controlled adapter | Spec is explicit and normative here (Section 32, 36); DL-003 resolved to Google-only | — | No alternative map vendor is in scope per DL-003 |
| Service worker for app shell + quest packet caching | Required for PWA + offline quest packets (Sections 8, 30) | — | — |

## Server: TypeScript API, modular monolith

| Choice | Why | Alternative considered | Why not (yet) |
|---|---|---|---|
| Node.js + TypeScript, Express or Fastify | Matches Section 36's "TypeScript API/backend-for-frontend" | NestJS | NestJS's built-in module boundaries map well to Section 36's "architectural boundaries" list, and is worth it once the monolith's module count grows past what plain framework conventions manage cleanly — revisit at Gate 2 if stronger structural enforcement is wanted, but not required to start |
| PostgreSQL + PostGIS | Explicit spec requirement (Section 36) for "owned geospatial data" | — | — |
| Redis (via `ioredis` or similar) | Explicit "Redis-compatible cache/queue where justified" (Section 36) | — | — |
| Zod for schema validation | Needed for "schema-validated structured output" from AI services (Section 14) and general request/API contract validation (Section 38) | — | — |
| Background job workers (BullMQ on Redis) | Explicit requirement for "feasibility refresh, moderation, notifications, and AI generation" as async, retryable work (Section 36); BullMQ gives retry/backoff/idempotency primitives the spec repeatedly asks for (Sections 14, 38) | `node-cron` for simple schedules only | Cron alone doesn't give queue/retry semantics needed for AI job status polling (Section 38: "long AI tasks should use job IDs or streaming with resumable status") |
| Object storage (S3-compatible) for media, with server-side EXIF stripping | Explicit requirement (Section 36, 26) | — | — |

## AI provider

Section 14 requires the AI systems to be schema-validated, versioned, cost-
budgeted, and provider-agnostic in the sense that no product requirement
names a vendor. **Recommendation:** build the AI service layer behind a
provider-agnostic interface (same "vendor adapter" pattern as Places/weather),
so the model vendor is swappable without touching product logic. A specific
vendor (e.g., Anthropic's Claude models) can be selected as the initial
implementation at Gate 2, but that's a live pricing/terms check to make then,
not a Gate 0 commitment — see `04-provider-licensing-questions.md` Q11-12 and
decision DL-008 (cost budgets).

## Mobile

Section 5 explicitly excludes native iOS/Android apps from MVP; Section 35
places native mobile clients "using the same API" at Release 2. No mobile
client work happens before that gate — the PWA is the only client target for
Release 1 and 1.1.

## Decision criteria used throughout

1. **Does the spec name this explicitly?** (Postgres+PostGIS, Redis, a
   server-rendering React framework, Google Maps/Places) → treat as settled,
   not open for re-litigation at Gate 0.
2. **Does the spec leave it open?** (exact job queue library, exact AI model
   provider, exact push-notification mechanism) → recommend based on how well
   it satisfies the *specific* spec requirements that touch it (e.g., BullMQ
   for the resumable-job-status requirement), flagged as revisit-at-Gate-2
   since versions and pricing shift.
3. **Everything is chosen from the spec text, not from any external
   codebase.**
