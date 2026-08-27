# Gate 0 — Contradictions, Ambiguities, and Assumptions

Per the spec's own instruction (Section 1): where requirements conflict, apply
the Section 4 decision hierarchy, surface the conflict, propose a resolution,
and wait — don't silently drop either requirement. Nothing below is resolved
yet; each has a proposed resolution but needs your confirmation (see
`06-decision-log.md` for the ones that need explicit sign-off).

## Contradictions

### C-1: MVP monetization boundary vs. Release 1 sponsorship features

Section 5 (MVP non-goals) excludes "in-app ticket or reservation purchasing"
and "cash creator payouts" from the first release. Section 35 (Release 1
scope) does *not* list sponsorship/promotion as an R1 item, but Section 33
(monetization principles) is written in present tense as if labeled sponsored
placement exists from the start, and Section 12 ranking rules already carve
out space for a "labeled sponsored boost."

**Proposed resolution:** Treat Section 33 as *principles that constrain any
future monetization*, not a mandate to build monetization in R1. R1 ships the
free discovery/creation/social/AI product; sponsorship/promotion/business
campaigns are Release 2 per Section 35's explicit scope table. The
ranking-boost *rule* (gate first, boost after, must be labeled) should still
be designed into the ranker now so it isn't retrofitted, but the business UI
and payment flow are not R1 work.

### C-2: Google Maps Platform as "foundational" vs. graceful-degradation requirement — RESOLVED

Section 32 declares Google Maps Platform/Places "foundational," but Section
42 requires graceful degradation "when maps ... providers fail" — implying
the architecture must not hard-depend on a single vendor's map tiles in a way
that breaks entirely on an outage.

**Resolution (DL-003, 2026-08-26):** Google Maps Platform/Places is the sole
place-data and map-tile provider — no second map vendor. "Graceful
degradation" is satisfied by designing the Places/provider-cache module
(Section 36) behind a vendor-neutral *adapter interface* even though only one
implementation exists, so a Google outage falls back to saved/community/
at-home content with disclosure (per Section 42's own example), not to a
second live map provider.

### C-3: "No autonomous publication of unverified AI quests" vs. "AI Suggested" trust badge existing at all

Section 5 excludes "autonomous public publication of unverified AI quests"
from MVP, but Section 15 defines an "AI Suggested" trust badge and Section 24
includes "AI Generated" as a formal publication state — both of which imply
AI-authored quests do reach some visible surface without human publication.

**Proposed resolution:** No contradiction once "publication" is read
narrowly: AI-generated quests can be shown *privately to the requesting user*
immediately (this is core to Quest Forge, Section 14.1) and can carry the "AI
Suggested" badge in that private context. What's excluded from MVP is an AI
quest reaching *public* visibility (Section 21's visibility scale) without
passing through Submitted→Approved→Published with human/trusted review
(Section 24). This should be stated explicitly in Gate 1's state-machine
design so engineering doesn't conflate "AI can generate" with "AI can
publish."

### C-4: Fog-of-war "never hides quest availability" vs. exploration-game incentive to explore blindly

Section 20 says fog of war "never hides quest availability or necessary map
information," but the entire point of a fog-of-war layer in comparable games
is that unexplored areas are visually obscured, which is a natural read of
"hides ... information." If a nearby quest is visually suppressed by fog,
that could violate the "never hides availability" rule; if it's always shown
through the fog, the fog layer becomes purely decorative.

**Proposed resolution:** Fog of war is a *cosmetic exploration-progress
overlay* on the map tiles/terrain, not a content-visibility filter. Quest
pins, list results, and search remain fully visible and functional regardless
of fog state; fog only desaturates/obscures the *background map texture* of
unexplored tiles. This preserves both requirements literally. Needs your
confirmation since it constrains the exploration game design meaningfully
(see DL-005).

### C-5: "Discovery stays useful without an account" vs. accessibility/personalization requiring saved state

Principle 5 (Section 3) says registration is required "only when persistence,
publishing, social interaction, or rewards genuinely require identity," and
Section 27 says accessibility preferences are used for matching. But if a
guest's accessibility needs aren't saved (no account), they'd have to
re-enter them every session, which works against Principle 10 ("accessibility
is matching data, not a checkbox").

**Proposed resolution:** Guests get ephemeral, session/device-local
accessibility and filter preferences (e.g., local storage / short-lived
session), which is "persistence" in the loose sense but not *account*
persistence — consistent with the letter of Principle 5. This should be
called out explicitly in the Gate 1 privacy/retention matrix as a distinct,
non-account retention category.

## Ambiguities requiring interpretation (lower stakes than contradictions)

- **"Overall tier" rounding thresholds** (Section 11): the spec gives weights
  but not the actual 1–5 → Novice–Mythic cutoff values. Treated as an open
  numeric calibration item, not a contradiction — see DL-006.
- **"Minimum response threshold" for aggregate ratings** (Section 23): no
  number given. Same category as above — DL-006.
- **Independent-account age default of 16** (Section 6): stated as a product
  default "where legally permitted," but U.S. platforms with UGC, social
  features, and minors commonly default to 13 (COPPA) with enhanced
  protections, not 16. Treated as a legal question, not an engineering
  ambiguity — see DL-002.
- **"Massachusetts pilot data meets an agreed geographic readiness
  threshold"** (Section 49): no threshold value defined; Section 50 lists
  this as an explicitly open decision already, so it's tracked directly in
  the decision log rather than re-litigated here.
- **Native mobile clients "using the same API"** (Section 35, Release 2): the
  spec's MVP non-goals (Section 5) exclude native apps entirely from Release
  1/1.1. Not a contradiction — just confirming no mobile client work starts
  before the Release 2 gate.

## Assumptions made in this Gate 0 pass

These aren't stated in the spec and were assumed to make the traceability
matrix and stack recommendation concrete. Flag any that are wrong.

1. "United States" launch scope means the product does not need
   multi-currency, RTL layout, or non-English content pipelines for R1
   (Section 35 lists translation/localization/units as Release 2).
2. "Modular monolith" (Section 36) means one deployable backend service with
   internally separated modules/boundaries (Section 36's list), not a
   microservices split, for at least Release 1 and 1.1.
3. Where the spec says a capability is required but doesn't name a specific
   vendor (weather, events, trails, transit — Section 32), no vendor
   selection is assumed at Gate 0; these are deferred to Gate 1 per-adapter
   ADRs.
4. "Claude" in Sections 47-48 (the execution contract) is read as this
   engineering agent generally, not a mandate to use the Anthropic API
   specifically for the in-product AI features — that's a separate
   product/vendor decision (Section 14 never names a model vendor for the
   in-app AI systems).
