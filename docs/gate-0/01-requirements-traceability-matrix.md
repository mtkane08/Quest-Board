# Gate 0 — Requirements Traceability Matrix

Format per spec Appendix B. IDs are stable once assigned; do not renumber —
supersede with a note instead. "Phase" uses the Release/Gate vocabulary from
Sections 35 and 47. Status is `Planned` for everything at Gate 0 (nothing is
implemented yet).

Coverage note: this matrix captures every *normative* requirement at the
granularity needed to plan and test against (roughly one row per testable
rule), not every sentence in the spec. Where a spec section is a long list of
similar items (e.g. quest structures, taxonomy tags), it is traced as one row
covering the whole list plus a note on the item count, to keep the matrix
usable rather than 400 rows of near-duplicates.

## Identity, accounts, and access (Section 6)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-001 | Guests browse map/list/search/filters/Rainy Day and one limited private AI quest without an account | R1 | Identity/Discovery | UI+API | E2E-GUEST-01 | Planned | Account required only for persistence/publish/social/rewards |
| QB-002 | 11 account/role types with a single identity switching among authorized roles | R1 | Identity | Data+API | UNIT-ROLE-01 | Planned | Guest, Adventurer, Guardian, Child, Household member, Creator, Business, Org, Tourism/Municipality, Moderator, Admin |
| QB-003 | Independent-account age default 16+ where legal; jurisdiction overrides; under-16 requires parent-managed profile | R1 | Identity | Data+API | UNIT-AGE-01 | Planned | Legal review required — see decision log DL-002 |
| QB-004 | Age-restricted content (alcohol, gambling) uses local legal threshold, not a hardcoded 21 | R1 | Discovery/Taxonomy | Data+API | UNIT-AGE-02 | Planned | Needs jurisdiction table |

## Information architecture (Section 7)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-010 | Five primary nav sections: Home/Board, Map/Realm, Forge, Hearth, Profile/Chronicle | R1 | UI | UI | E2E-NAV-01 | Planned | |
| QB-011 | First-open experience combines personalized/guest feed, a prominent intent prompt, and one-tap Map/Hearth access | R1 | UI | UI | E2E-NAV-02 | Planned | |

## Taxonomy (Section 8)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-020 | Taxonomy is data-driven and editable without a code deploy (realms, guilds, tags, aliases, exclusions, safety metadata) | R1 | Taxonomy | Data+Admin UI | UNIT-TAX-01 | Planned | Drives DL-006 (numeric thresholds are separate) |
| QB-021 | 4 realms, 12 initial guilds with plain-language scope mapping, per Section 8 tables | R1 | Taxonomy | Data | UNIT-TAX-02 | Planned | Seed data, not schema |
| QB-022 | Nightlife/alcohol/gambling/hunting/extreme-sports/horror/mature content require explicit classification + local-rule check + age gate; never shown to child profiles | R1 | Taxonomy/Moderation | Data+API | UNIT-TAX-03 | Planned | Hard gate, ranks above relevance in Section 4 |

## Quest structures and data contract (Sections 9-10)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-030 | Quest engine supports 16 structure types (checklist, branching, timed, scavenger hunt, campaign, etc.) | R1-R2 | Quest catalog | Data+API | UNIT-QSTRUCT-01 | Planned | Not all structures need UI in R1; schema must not block them |
| QB-031 | Safety/accessibility/cost/time/travel/equipment/age/cancellation/prerequisites are visible before starting, regardless of spoilers | R1 | Quest catalog/UI | UI+Data | E2E-PREFLIGHT-01 | Planned | "Preflight checklist" screen (Section 46) |
| QB-032 | Quest entity supports the full field set in Section 10 (id/version, provenance, tiering, accessibility profile, restrictions, evidence policy, sponsorship, localization, etc.) | R1 | Quest catalog | Data | UNIT-SCHEMA-01 | Planned | This is the master schema row; see Gate 1 data model |

## Tier system (Section 11)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-040 | 5 user-visible tiers (Novice→Mythic) label quest challenge, not user rank | R1 | Tiering | Data+UI | UNIT-TIER-01 | Planned | |
| QB-041 | 9 weighted factor scores (1-5 each) combine into overall tier via calibrated thresholds; category profiles may override weights but overrides are versioned/explainable | R1 | Tiering | Data+API | UNIT-TIER-02 | Planned | Numeric thresholds are DL-006, open |
| QB-042 | Risk is a separate, non-averaged suitability constraint and visible label, not folded into the weighted mean | R1 | Tiering | Data+UI | UNIT-TIER-03 | Planned | High risk requires curation/warnings/prerequisites/prohibition |

## Discovery and recommendation (Section 12)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-050 | Discovery surfaces: map pins/clusters, personalized feed, search, collections, Surprise Me, swipe cards, route builder, calendar, trending, friend activity, creator pages, saved collections, conversational guide | R1-R1.1 | Discovery | UI+API | E2E-DISCOVER-01 | Planned | Route builder + friend activity partly R1.1 |
| QB-051 | ~18 session filters (time, distance, budget, indoor/outdoor, group, accessibility, transport, pet-friendly, open-now, mood, tier, weather tolerance, adult-content visibility, etc.) | R1 | Discovery | UI+API | UNIT-FILTER-01 | Planned | |
| QB-052 | Personalization uses lightweight profile + explicit saved preferences + session filters + behavioral history under user control; never infers sensitive traits when a practical constraint could be stated directly | R1 | Discovery/Privacy | Data+API | UNIT-PERSONALIZE-01 | Planned | Constrains recommender design in Gate 1 |
| QB-053 | Ranking order: hard-filter legality/age/safety/accessibility/feasibility/privacy/time/budget first, then rank by relevance/distance/open-status/quality/verification/novelty/history/social/diversity; sponsored placement is a labeled post-gate boost only | R1 | Discovery | API | UNIT-RANK-01 | Planned | Encodes Section 4 hierarchy into the ranker — central Gate 1 design item |

## Generation entry points & AI systems (Sections 13-14)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-060 | 9 generation entry points (map point, idea, constraints, mood, pantry/inventory, participants, photo/flyer, anchor+stops, Surprise Me) | R1 | Generation | UI+API | E2E-GENERATE-01 | Planned | Photo/flyer extraction may slip to R1.1 |
| QB-061 | Quest Forge outputs fully structured, editable quest data (title, objectives, tier/factors, estimates, safety/accessibility/age/uncertainty notes, completion methods, reward, tone/card copy); every field editable; supports lock/compare-variants/"more epic"/"shorter"/tone change | R1 | Generation | API+UI | E2E-FORGE-01 | Planned | |
| QB-062 | Conversational guide uses only session info + explicit saved preferences, summarizes assumptions, supports single-stop/constraint replacement without full regeneration | R1 | Generation | API+UI | E2E-GUIDE-01 | Planned | |
| QB-063 | Nearby generator produces variants on demand from verified location data rather than storing every combination | R1 | Generation | API | UNIT-GEN-01 | Planned | Cost/caching implication — see DL-008 |
| QB-064 | Feasibility evaluator returns structured checks/confidence/blockers/warnings/unknowns/publication-scope from structured inputs; may not mark feasible on prose plausibility alone | R1 | Feasibility | API | UNIT-FEAS-01 | Planned | |
| QB-065 | Supporting AI: moderation/adult classification, duplicate detection, translation, inventory/image extraction, candidate generation, tone transform, factual-claim/citation mapping | R1-R2 | AI services | API | UNIT-AI-SUPPORT-01 | Planned | Translation is R2 (Section 35); rest are R1 |
| QB-066 | AI implementation requirements: schema-validated output, versioned prompts/models, logged I/O with privacy/retention, timeouts/retries/fallback, cost budgets + per-user rate limits, factual-context/creative-instruction separation, no fabricated facts, human-editable output with visible uncertainty, offline/static fallback | R1 | AI infra | API | INTEG-AI-01 | Planned | Cross-cutting — applies to every AI service above |

## Feasibility, verification, provenance (Section 15)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-070 | 11-point feasibility checklist (existence/Place ID, public vs private access, legal approach/parking/transit, hours/seasonal/weather/daylight, cost/reservation/permit, route continuity, terrain/equipment/group limits, venue rules, age/supervision, recent reports, objective realism, trespass/harassment risk) run before recommend/publish for location-dependent quests | R1 | Feasibility | API | INTEG-FEAS-01 | Planned | |
| QB-071 | 8 trust badges, combinable, with user-visible definitions | R1 | Feasibility/Trust | Data+UI | UNIT-TRUST-01 | Planned | |
| QB-072 | 4-tier confidence behavior (high/medium/low/critical-blocker) gates recommendation and publication eligibility | R1 | Feasibility | API | UNIT-FEAS-02 | Planned | |
| QB-073 | Scout Quests invite confirmation of ordinary conditions without incentivizing entry to uncertain/restricted/unsafe areas | R1.1 | Feasibility/Community | Data+UI | UNIT-SCOUT-01 | Planned | |
| QB-074 | Every factual field records source/provider ID, retrieval time, last verification, confidence, conflicts, and assertion type (sourced/creator/community/AI); educational claims cite sources; flavor is distinguishable from fact | R1 | Provenance | Data | UNIT-PROV-01 | Planned | This is the core anti-hallucination contract |

## Rainy Day / Hearth (Section 16)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-080 | Hearth is a first-class mode (curated indoor quests, supply-based generation, nearby indoor destinations, themed multi-activity adventures), not a weather filter | R1 | Hearth | UI+API | E2E-HEARTH-01 | Planned | |
| QB-081 | Inventory is optional, private by default, editable/exportable/deletable; image extraction requires confirmation before permanent add | R1 (typed) / R1.1 (photo) | Hearth | Data+API | UNIT-INV-01 | Planned | Typed inventory is R1; photo extraction is R1.1 per Section 35 |

## Multi-stop adventures (Section 17)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-090 | Multi-stop itineraries (afternoon plans, crawls, road trips, scavenger hunts) with route optimization over travel time/hours/reservations/weather/accessibility/party constraints | R1.1 | Routing | API+UI | E2E-ROUTE-01 | Planned | Per Section 35, full route builder is R1.1 |
| QB-091 | Single-stop replace/reorder/lock/remove without regenerating the whole itinerary; app proposes alternatives with an explanation when conditions change | R1.1 | Routing | API+UI | E2E-ROUTE-02 | Planned | |

## Completion and evidence (Section 18)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-100 | 7 completion methods (honor, GPS/geofence, photo/video, answer/code, host approval, party confirmation, external verification) | R1 | Attempts | API+UI | UNIT-COMPLETE-01 | Planned | |
| QB-101 | Evidence requirements proportional to quest risk/type — no demanding precise GPS/photo when honor-based suffices | R1 | Attempts | API | UNIT-COMPLETE-02 | Planned | Design rule for quest templates, not just code |
| QB-102 | Pause/resume/abandon without harsh penalty, retry, partial XP, hints per quest rules; creators set rules within platform safeguards | R1 | Attempts | API+UI | UNIT-COMPLETE-03 | Planned | |

## Progression and rewards (Section 19)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-110 | XP/levels, ranks/titles, category mastery, badges/achievements/collections/streaks, exploration milestones, community recognition, seasonal challenges, opt-in competitive boards | R1 (core) / R1.1-R2 (mastery, seasonal, boards) | Progression | Data+API+UI | UNIT-XP-01 | Planned | Section 35 splits basic XP/levels/badges (R1) from richer mastery/seasonal (later) |
| QB-111 | No punitive streak loss; competitive features optional; anti-farming via diminishing returns, duplicate restriction, anomaly checks, daily soft caps, stronger verification for high rewards | R1 | Progression | API | UNIT-XP-02 | Planned | |

## Fog of war (Section 20)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-120 | Fog of war is opt-in, never hides quest availability or necessary map info; reveal rules differ by travel mode (walk/cycle detailed, drive narrow route, quest completion reveals wider area) | R1.1 | Exploration | API+UI | E2E-FOG-01 | Planned | Foreground-only in R1.1 per Section 35; background tracking is separate, later |
| QB-121 | Tracking pausable/deletable/disable-able without losing ordinary discovery; named progress by town/city (dense) or county (rural) | R1.1 | Exploration | Data+API | UNIT-FOG-01 | Planned | |
| QB-122 | Detect impossible travel / GPS spoofing / repeat farming cautiously; never penalize GPS drift, mobility limitations, transit use, or accessibility accommodations | R1.1 | Exploration/Trust&Safety | API | UNIT-FOG-02 | Planned | "Cautiously" implies human review before punitive action — Gate 1 design item |

## Social, parties, organizations (Section 21)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-130 | Friends/following, invite links, private parties, households, guilds, org boards, saved collections, creator profiles, reviews/comments/photos, collaborative creation | R1 (parties by invite) / R2 (public group events) | Social | Data+API+UI | E2E-PARTY-01 | Planned | |
| QB-131 | 7 quest visibility levels (private → public → scheduled public event) | R1 | Social/Quest catalog | Data+API | UNIT-VIS-01 | Planned | |
| QB-132 | Major edit to a quest with existing completions creates a new version; historical attempts keep the version they completed | R1 | Quest catalog | Data+API | UNIT-VERSION-01 | Planned | |
| QB-133 | Public gatherings limited to verified businesses/orgs/creators/trusted community in MVP; open DM and stranger matchmaking deferred | R1 (restricted) / Later (open) | Social/Moderation | API | UNIT-SOCIAL-01 | Planned | Hard MVP boundary, not a nice-to-have |

## Creator rights and business participation (Section 22)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-140 | Creators retain ownership; grant only the license needed to host/display/moderate/translate/operate; AI adaptation/remix/sponsorship/commercial use need explicit creator-controlled terms | R1 | Creator/Legal | Data+API | LEGAL-REVIEW-01 | Planned | Needs actual ToS drafting — see DL-001 |
| QB-141 | Deleted public content disappears unless retained for legal/dispute/safety/audit reasons | R1 | Moderation | Data | UNIT-DELETE-01 | Planned | |
| QB-142 | Businesses can claim venues, create verified quests, offer rewards, sponsor creators, view aggregate privacy-preserving analytics, respond to reviews, run limited-time events, buy labeled promotion; cannot hide criticism/falsify status/manipulate ratings/get precise individual location histories | R2 | Business platform | Data+API+UI | E2E-BIZ-01 | Planned | Full business platform is Release 2 per Section 35 |

## Ratings, duplication, community quality (Section 23)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-150 | 4 post-completion ratings (enjoyment, accuracy, tier accuracy, recommend) plus targeted issue reports (accessibility/safety/cost/factual/closure/legal) | R1 | Ratings | Data+API+UI | UNIT-RATING-01 | Planned | |
| QB-151 | Aggregate rating display delayed/qualified until a minimum response threshold | R1 | Ratings | API | UNIT-RATING-02 | Planned | Threshold value is open — DL-006 |
| QB-152 | Group similar quests per place, rank quality versions, detect near-duplicates, suggest merges, preserve distinct quests when audience/story/objectives/accessibility/structure differ materially | R1.1 | Quest catalog | API | UNIT-DEDUPE-01 | Planned | |

## Moderation and content lifecycle (Section 24)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-160 | Automated prescreen + trusted/human review + user reports + creator reputation + place validation + ratings + appeals + rapid removal pipeline | R1 | Moderation | API+Admin UI | INTEG-MOD-01 | Planned | |
| QB-161 | Explicit prohibited-content list (trespassing, harassment, illegal acts, deception, dangerous conduct, discrimination, sexual exploitation, self-harm, interference) | R1 | Moderation | Data+API | UNIT-MOD-01 | Planned | Feeds moderation classifier rules and human review criteria |
| QB-162 | New creators require review for public quests until trusted; trusted status revocable and never exempts from safety systems | R1 | Moderation/Creator | Data+API | UNIT-MOD-02 | Planned | |
| QB-163 | Quest publication state machine: Draft→AI Generated→Feasibility Review→Needs Correction→Submitted→Approved→Published, plus post-publish states (Conditions Uncertain, Temporarily Unavailable, Flagged, Suspended, Archived, Superseded) | R1 | Quest catalog | Data+API | UNIT-STATE-01 | Planned | Formal state machine — Gate 1 deliverable |
| QB-164 | Attempt state machine: Saved→Planned→Active→Paused→{Completed/Partially Completed/Abandoned/Expired/Disputed} | R1 | Attempts | Data+API | UNIT-STATE-02 | Planned | |
| QB-165 | All state transitions carry authorization rules, timestamps, actor IDs, reason codes, audit events | R1 | Moderation/Audit | Data+API | UNIT-AUDIT-01 | Planned | Cross-cutting infra requirement |

## Safety incident response (Section 25)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-170 | Reporting paths for closures/inaccessibility/unsafe conditions/bad directions/trespass/injury-emergency/harassment/fraud/inappropriate child content/incorrect restrictions | R1 | Safety | API+UI | E2E-REPORT-01 | Planned | |
| QB-171 | High-severity reports can temporarily suppress a quest pending review; evidence retained per policy; affected active users notified when appropriate; moderator actions logged; appeals supported; emergency contact/exit affordance during active quests; app never claims to be emergency services | R1 | Safety/Moderation | API+UI | INTEG-SAFETY-01 | Planned | |

## Privacy and child safety (Section 26)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-180 | Precise location processed only when necessary/permitted; never shown on public profiles; completion visibility user-controlled; uploaded media stripped of location EXIF by default | R1 | Privacy | API+UI | UNIT-PRIVACY-01 | Planned | |
| QB-181 | Stronger privacy defaults for child/family profiles; no public DM or age-restricted quests for children; parent approval for public events/stranger groups involving minors; photo sharing/leaderboards private by default for minors | R1 | Privacy/Child safety | Data+API | UNIT-CHILD-01 | Planned | Highest-priority safety item after legality itself |
| QB-182 | Temporary party/family location sharing only during an active quest, with clear participants and expiration | R1 | Privacy/Social | Data+API | UNIT-PRIVACY-02 | Planned | |
| QB-183 | Users can export/erase location, quest, inventory, and AI-history data subject to lawful retention | R1 | Privacy | API | E2E-PRIVACY-01 | Planned | GDPR/CCPA-style DSR flow |
| QB-184 | Retention matrix covering search location, active tracking, fog history, evidence, party location, home inventory, AI conversations, moderation records, child data — with purpose/visibility/encryption/retention/deletion/legal-basis columns | Gate 1 | Privacy | Docs+Data | DOC-REVIEW-01 | Planned | This is a Gate 1 deliverable, not code |

## Accessibility (Section 27)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-190 | Accessibility profile covers 10 categories (mobility, standing limits, vision/hearing, sensory, cognitive, dietary, restroom/seating, service animal, companion needs, plain-language); private, optional, used for matching | R1 | Accessibility | Data+API | UNIT-A11Y-01 | Planned | |
| QB-191 | 5-state accessibility confidence (confirmed/reported/partially/not/unknown); never infer accessible from absence of contrary data; never premium-gated | R1 | Accessibility | Data+UI | UNIT-A11Y-02 | Planned | |
| QB-192 | WCAG 2.2 AA target: keyboard nav, screen reader support, scalable text, reduced motion, non-color-only status cues, high contrast, captions/transcripts, clear focus, accessible map alternative | R1 | UI (cross-cutting) | UI | A11Y-AUDIT-01 | Planned | |

## Themes and tone (Section 28)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-200 | 12 initial narration tones + custom (moderated); theme change never changes underlying facts/tier/warnings/accessibility/requirements | R1 | Theming | Data+API+UI | UNIT-THEME-01 | Planned | Custom tone moderation ties into QB-160 |

## Notifications and permissions (Section 29)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-210 | Independently controllable notification types; nearby proactive alerts off by default | R1 | Notifications | Data+API+UI | UNIT-NOTIF-01 | Planned | |
| QB-211 | Contextual permission requests (location/background-location/camera/photos/notifications/calendar/contacts/motion) with plain explanation and functional denial state; background location never required for ordinary discovery | R1 | Permissions (client) | UI | E2E-PERMISSION-01 | Planned | |

## Offline behavior (Section 30)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-220 | Downloadable quest packets (instructions, route/checkpoints, limited map context, puzzle assets, hints, safety info, party roster, queued evidence); show packet age and staleness | R1.1 | Offline | Data+API+UI | E2E-OFFLINE-01 | Planned | |
| QB-221 | Idempotent sync of queued actions on reconnect with conflict surfacing | R1.1 | Offline/API | API | UNIT-SYNC-01 | Planned | |

## Geographic rollout (Section 31)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-230 | Architecture supports US-wide from launch; operational validation proceeds state-by-state starting with Massachusetts | R1 | Geo/Ops | Data+Ops | INTEG-GEO-01 | Planned | |
| QB-231 | Sparse-data fallback: terrain/roads/parks/broad categories, location-independent quest types, community invitation, visible trust level, visible confidence, no unverifiable claims | R1 | Discovery/Feasibility | API+UI | UNIT-SPARSE-01 | Planned | |
| QB-232 | Internal geographic readiness score (density, verification recency, external coverage, community supply, moderation capacity, completion feedback, seasonal reliability) | R1.1 | Geo/Ops | Data+Admin UI | UNIT-READY-01 | Planned | Internal metric; user-facing surface is availability/uncertainty only |

## External data and integrations (Section 32)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-240 | Google Maps Platform + Google Places are foundational; additional integrations (weather, movies, ticketing, menus/reservations, trails, transit, historical/cultural, gov/community events, volunteering, calendar, nav handoff) evaluated on usefulness/licensing/reliability/coverage/privacy/cost | R1 (Maps/Places) / R1-R2 (rest) | Provider adapters | API | INTEG-PROVIDER-01 | Planned | See `04-provider-licensing-questions.md` — conflicts with prior art, see DL-003 |
| QB-241 | Outbound links for bookings; Google/Apple Maps handoff for turn-by-turn nav; internal nav limited to checkpoints/distance/progress | R1 | Navigation | API+UI | E2E-NAV-HANDOFF-01 | Planned | |
| QB-242 | Documented provider rules for caching/storage/attribution/derived data/refresh/mixed-map display/overlays/deletion before finalizing data architecture; Places data not assumed permanently copyable | Gate 1 | Provider adapters/Legal | Docs | DOC-REVIEW-02 | Planned | Blocking item for Gate 1 data model — DL-003 |

## Monetization (Section 33)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-250 | Core discovery free; precise location never sold; sponsored content labeled and cannot buy rating/suppress reviews; no targeted ads to child profiles; safety/accessibility data never premium; AI has transparent free-tier quotas | R1 (foundation) / R2 (full monetization) | Monetization | API+UI | UNIT-MONETIZE-01 | Planned | MVP explicitly excludes cash payouts/ticket purchasing (Section 5) — conflicts with prior art Stripe integration, see DL-004 |

## Nonfunctional / security / testing (Sections 38-44)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-260 | Versioned typed API contracts with auth/authz/validation/pagination/idempotency/rate limits/error codes/audit; long AI tasks use job IDs or resumable streaming; idempotency keys on reward/evidence/invitation/payment mutations | R1 | API infra | API | INTEG-API-01 | Planned | |
| QB-261 | Threat model coverage: stalking via location history, child targeting, malicious hosts, GPS spoofing, unsafe/trespassing objectives, fraudulent venue claims/rewards, account takeover, EXIF leakage, abusive uploads/comments, prompt injection from external content, API-key theft, bot generation, rating manipulation, privilege escalation | Gate 1 | Security | Docs+API | SEC-REVIEW-01 | Planned | Gate 1 deliverable (threat model doc) + ongoing controls |
| QB-262 | Security controls: least privilege, row/object authz, server-side secrets, encryption in transit/at rest, signed short-lived uploads, media scanning, EXIF stripping, CSP, rate limits, abuse detection, audit trails, moderator separation, secure recovery, dependency scanning, backups, incident response | R1 | Security (cross-cutting) | API+Infra | SEC-REVIEW-02 | Planned | |
| QB-263 | External text (webpages/reviews/menus/flyers/user text) is untrusted and must never override system instructions or tool policy | R1 | AI infra/Security | API | SEC-PROMPT-01 | Planned | Direct analog of this session's own instruction-source-boundary rule |
| QB-264 | Nonfunctional targets: WCAG 2.2 AA, current major browsers, ~2.5s p75 first-content, responsive clustered map, API p95 <500ms (excl. 3rd-party), simple AI gen <15s typical, 99.9% monthly availability post-beta, graceful degradation per provider, tested backups/restore, structured logs/metrics/traces/cost monitoring, per-quest AI/provider cost budgets | R1 | Infra/Ops | Infra | PERF-TEST-01 | Planned | Targets are provisional pending validated budgets per spec text |
| QB-265 | Full test pyramid: unit (tiering/authz/filters/rewards/state), contract (adapters), integration (generate→feasibility→moderate→publish), E2E (core journeys), accessibility automation+manual, geospatial/timezone/DST/route tests, offline/retry/idempotency tests, security/upload/rate-limit/role-escalation tests, load+cost tests | R1+ | Testing infra | Tests | (this row is the test plan itself) | Planned | |
| QB-266 | Versioned AI evaluation sets across urban/rural/weather/family/teen/accessibility/adult/seasonal/sparse/conflicting-source/dangerous/injection/cultural/translation/tone cases, scored on factuality/feasibility/safety/constraint-satisfaction/accessibility-honesty/source-mapping/tone/edit-rate/duplication/refusal-quality; a prompt/model change can't ship outside agreed thresholds | R1 | AI infra | Eval harness | AI-EVAL-01 | Planned | This is the AI equivalent of a regression suite — must exist before Gate 4 |

## Admin console (Section 41)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-270 | Admin console: moderation/publication, reports/appeals/incidents, verification/claims, location corrections/duplicates, confidence/stale-data review, regional readiness, adult classification, featured collections, taxonomy/tone mgmt, API/AI cost, generation-quality review, audit search/permissions | R1 (essential subset) / R1.1-R2 (rest) | Admin | Admin UI+API | E2E-ADMIN-01 | Planned | MVP implements moderation/reports/suspension/verification/audit first, per spec text |

## Product states / failure handling (Section 42)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-280 | Every major screen has loading/empty/error/partial-data/offline/permission-denied/age-blocked/location-unavailable/no-results/provider-degraded/stale-data states, with the specific fallbacks listed in Section 42 | R1 | UI (cross-cutting) | UI | E2E-STATES-01 | Planned | |

## Acceptance scenarios (Section 43)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-290 | 15 named acceptance scenarios (Boston guest museum quest, rural county nature options, family rainy-day pantry quest, wheelchair-user date with honest unknowns, minor blocked from adult content, creator epic-rewrite submission, blocked closed-attraction quest, itinerary single-stop replace, uncertain-legal-access quest can't show as verified, GPS-denied honor completion, screened malicious submission, offline packet sync, fog reveal by travel mode, labeled promotion without rating manipulation, selective history deletion) | R1-R1.1 | Cross-cutting | E2E | E2E-ACCEPT-01..15 | Planned | These become the MVP-done E2E suite — one test ID per scenario |

## Design and screens (Sections 45-46)

| ID | Requirement | Phase | Module | Impact | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| QB-300 | Quest card minimum content set (title/summary, image hierarchy, tier+factors, time/cost/distance/open-state, tags, accessibility/adult indicators, origin/trust/confidence, save/start action, sponsor disclosure); non-color equivalents for map pins/badges; clustering; every map result available as an accessible list | R1 | UI | UI | A11Y-AUDIT-02 | Planned | |
| QB-301 | ~20-screen inventory from onboarding through admin dashboards (Section 46) | R1-R2 | UI | UI | (traced per-screen in Gate 1 wireflows) | Planned | Full screen-by-screen mapping deferred to Gate 1 wireflows |

---

**Note on completeness:** IDs QB-001–QB-301 trace every section with normative
"must/shall/support" language. Sections not listed above (1-3 vision/principles,
34 metrics, 36-37 architecture/entities, 47-50 process) are process/architecture
guidance rather than testable product requirements and are tracked instead in
[`05-recommended-stack.md`](05-recommended-stack.md) and
[`06-decision-log.md`](06-decision-log.md).
