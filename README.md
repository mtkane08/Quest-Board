# Quest Board

Real-world adventure / local-discovery / AI quest-generation platform, built
**purely from** the Master Product Specification in
[`docs/spec/`](docs/spec/Quest_Board_Master_Product_Specification.md). No
other codebase is used as a reference or reuse source (see Gate 0 decision
DL-012) — every design choice here traces back to the spec text.

## Status: Gate 7 — Exploration and Hardening (complete; final spec-defined gate)

All 8 gates from the spec's execution contract (Section 47-48) are now
built: requirements/design (Gates 0-1), Foundation through Community
Safety (Gates 2-6), and Gate 7 — opt-in fog-of-war exploration, offline
quest packets, idempotency-key hardening, a real accessibility lint layer,
an AI evaluation harness, and backup/restore scripts. **This does not mean
the product is a finished, shippable MVP** — see
[`docs/gate-7/01-mvp-done-checklist.md`](docs/gate-7/01-mvp-done-checklist.md)
for an unflinching, evidence-based answer against the spec's own Section 49
exit criteria. Since that report was written, `next` was upgraded 14→16 to
close the one real dependency vulnerability it found (`npm audit` is now
clean), and cross-site cookie handling was fixed for real deployment — see
[`docs/deployment.md`](docs/deployment.md) for deploying this to Render.
The milestone report is
[`docs/gate-7/00-hardening-report.md`](docs/gate-7/00-hardening-report.md).
Earlier reports:
[Gate 2](docs/gate-2/00-foundation-report.md),
[Gate 3](docs/gate-3/00-discovery-report.md),
[Gate 4](docs/gate-4/00-forge-report.md),
[Gate 5](docs/gate-5/00-attempts-report.md),
[Gate 6](docs/gate-6/00-community-safety-report.md).

## Quickstart

```bash
cp .env.example .env   # fill in SESSION_SECRET (any string ≥16 chars for dev)
docker-compose up -d postgres redis
npm install
npm run db:migrate
npm run db:seed
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000, in another terminal
```

Then visit `/discover` for discovery, `/register` and `/forge` for the
quest-creation flow, `/hearth` for typed inventory, `/profile` for
progression/privacy/age-attestation/exploration, `/offline` for saved
quest packets, or `http://localhost:3000` for the Gate 2 health/taxonomy
demo. Requires Docker Desktop for local Postgres+PostGIS/Redis — **this
Quickstart has never actually been run in the environment this project was
built in** (no Docker, no browser) — see every gate report's "Known
limitations" and, especially, `docs/gate-7/01-mvp-done-checklist.md`.

## Deployment

See [`docs/deployment.md`](docs/deployment.md) and `render.yaml` at the
repo root for deploying this to Render — also never actually applied (needs
a Render account only you can create), same honesty as everything else
here.

### Gate 0 — Requirements Audit

| Deliverable | File |
|---|---|
| Product understanding | [`00-product-understanding.md`](docs/gate-0/00-product-understanding.md) |
| Requirements traceability matrix | [`01-requirements-traceability-matrix.md`](docs/gate-0/01-requirements-traceability-matrix.md) |
| Contradictions & assumptions | [`02-contradictions-and-assumptions.md`](docs/gate-0/02-contradictions-and-assumptions.md) |
| Risk register | [`03-risk-register.md`](docs/gate-0/03-risk-register.md) |
| Provider & licensing questions | [`04-provider-licensing-questions.md`](docs/gate-0/04-provider-licensing-questions.md) |
| Recommended MVP stack | [`05-recommended-stack.md`](docs/gate-0/05-recommended-stack.md) |
| Decision log (owner/phase/options) | [`06-decision-log.md`](docs/gate-0/06-decision-log.md) |
| Prior-art survey (historical, superseded) | [`07-prior-art-questmap.md`](docs/gate-0/07-prior-art-questmap.md) |

### Gate 1 — Product and System Design

| Deliverable | File |
|---|---|
| Architecture decision records | [`01-architecture-decision-records.md`](docs/gate-1/01-architecture-decision-records.md) |
| System/context and module diagrams | [`02-system-context-and-modules.md`](docs/gate-1/02-system-context-and-modules.md) |
| Data model and migrations plan | [`03-data-model.md`](docs/gate-1/03-data-model.md) |
| API contracts | [`04-api-contracts.md`](docs/gate-1/04-api-contracts.md) |
| Role/permission matrix | [`05-role-permission-matrix.md`](docs/gate-1/05-role-permission-matrix.md) |
| Quest and attempt state machines | [`06-state-machines.md`](docs/gate-1/06-state-machines.md) |
| AI service schemas and prompt boundaries | [`07-ai-service-schemas.md`](docs/gate-1/07-ai-service-schemas.md) |
| Privacy/retention matrix | [`08-privacy-retention-matrix.md`](docs/gate-1/08-privacy-retention-matrix.md) |
| Threat model | [`09-threat-model.md`](docs/gate-1/09-threat-model.md) |
| Wireflows and screen/state inventory | [`10-wireflows-and-screens.md`](docs/gate-1/10-wireflows-and-screens.md) |
| Analytics event dictionary | [`11-analytics-event-dictionary.md`](docs/gate-1/11-analytics-event-dictionary.md) |

### Gate 2 — Foundation

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-foundation-report.md`](docs/gate-2/00-foundation-report.md) |

### Gate 3 — Discovery Vertical Slice

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-discovery-report.md`](docs/gate-3/00-discovery-report.md) |

### Gate 4 — Forge and Feasibility

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-forge-report.md`](docs/gate-4/00-forge-report.md) |

### Gate 5 — Attempts and Hearth

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-attempts-report.md`](docs/gate-5/00-attempts-report.md) |

### Gate 6 — Community Safety

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-community-safety-report.md`](docs/gate-6/00-community-safety-report.md) |

### Gate 7 — Exploration and Hardening (final spec-defined gate)

| Deliverable | File |
|---|---|
| Milestone report (scope, tests, manual verification, limitations) | [`00-hardening-report.md`](docs/gate-7/00-hardening-report.md) |
| **Definition-of-done checklist against spec Section 49** | [`01-mvp-done-checklist.md`](docs/gate-7/01-mvp-done-checklist.md) |
| Source | [`apps/api/`](apps/api), [`apps/web/`](apps/web) |

## Next step

**Run the Quickstart above.** Every gate of this project was built,
typechecked, linted, and tested without ever once running against a real
browser or database — that's the single most important thing to do next,
and `docs/gate-7/01-mvp-done-checklist.md` explains exactly why that
matters and what's likely to need attention when you do. Beyond that:

1. Decide the still-open items in
   [`06-decision-log.md`](docs/gate-0/06-decision-log.md) (age threshold,
   evidence retention duration, AI cost budgets, moderation staffing, MA
   pilot scope) — none blocked building, but several block launching.
2. Decide on the Next.js security upgrade flagged in the Gate 7 report
   (major version bump, needs a real test pass).
3. Review `docs/gate-0/04-provider-licensing-questions.md` before
   configuring a real Google Places or AI provider key.
4. Everything past this point — native mobile, business/organization
   verification, in-app payments, broader public matchmaking,
   international expansion — is explicitly Release 1.1/2/Later scope per
   the spec (Sections 5, 35, 50), not a gap in this build.
