# Gate 0 — Product Understanding

## What Quest Board is

Quest Board is a mobile-first PWA that reframes "things to do" — nearby,
at-home, and multi-stop — as **quests**: structured, gamified activities with
a title, objective(s), estimated time/cost/effort, safety and accessibility
data, and a completion method. It sits at the intersection of five things the
spec is explicit are *not* the same feature:

1. A **real-world adventure game** (tiers, XP, ranks, fog-of-war exploration).
2. A **local activity-discovery app** (map/list search over Google Places data,
   filters, "open now", trending).
3. A **social quest platform** (parties, households, guilds, invite links,
   creator profiles, reviews) — deliberately *not* open stranger messaging or
   matchmaking in v1.
4. An **AI-assisted itinerary/activity generator** ("Quest Forge" and a
   conversational guide) that turns plain ideas into structured, editable
   quest data with visible confidence and provenance — never fabricated facts.
5. A **creator/business platform** (private → public quest publishing,
   business venue claims, sponsorship) gated behind moderation and trust
   tiers.

## The organizing constraint

Everything else in the spec is downstream of one rule, stated as a strict
**decision hierarchy** (Section 4): safety/legality > age/child protection >
accessibility > feasibility/factual confidence > privacy/consent > relevance >
quest/creator quality > affordability/time/travel fit > novelty > gamification
> monetization. No feature, AI output, ranking boost, or business incentive is
allowed to move up that list. Concretely this means:

- AI ("Quest Forge", conversational guide, nearby generator) is a **bounded,
  schema-validated service**, not a free-text generator — it cannot invent
  hours, prices, accessibility, or history, and every claim carries
  provenance and a confidence tier (Section 14–15).
- A quest cannot be recommended or published without passing **feasibility
  checks** (destination exists, legally accessible, open, affordable, within
  travel/party constraints) — confidence has four tiers from "ordinary
  recommendation" down to "blocked" (Section 15).
- **Trust badges** (AI Suggested → Business Verified → Quest Board Curated)
  and **publication states** (Draft → Feasibility Review → Submitted →
  Approved → Published, with post-publish states like Conditions Uncertain)
  gate what an unverified idea is allowed to look like to other users
  (Section 24).
- Accessibility, safety, and privacy data are **never premium-gated** and
  **never inferred as positive by default** — "unknown" is a first-class
  state distinct from "confirmed accessible" (Section 27).
- Monetization (sponsorship, boosts) can only apply *after* the suitability
  gates, must be labeled, and cannot buy organic rating or suppress
  criticism (Section 33).

## What's explicitly out of scope for MVP (Section 5)

Native iOS/Android apps, in-app ticket/reservation purchasing, unrestricted
DMs, stranger-created public gatherings, cash creator payouts, background
location by default, full offline basemaps, autonomous publication of
unverified AI quests, bespoke AI art per quest, a full ad exchange, and
non-US legal/content support. These may exist as schema fields or feature
flags but must not be built out.

## Why this matters for sequencing

The spec's own execution contract (Section 47–48) forbids writing production
code before this Gate 0 audit and a Gate 1 architecture/design pass are
reviewed and approved, and mandates building **one vertical, testable
milestone at a time** afterward (Gates 2–7), each ending in a status report
against requirements, tests, cost, and known limitations — not a single
big-bang build. That gating structure is treated here as a hard requirement,
not a suggestion: see [`06-decision-log.md`](06-decision-log.md) for what
needs your sign-off before Gate 1 starts.
