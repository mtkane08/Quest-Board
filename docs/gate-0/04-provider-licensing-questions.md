# Gate 0 — External Provider and Licensing Questions

These require human/legal verification before Gate 1's data architecture is
finalized (Section 32 is explicit: "Do not assume Google Places records may
be permanently copied into the product database"). None of these block
starting Gate 1 design work, but the data model and caching architecture
cannot be *finalized* until they're answered.

## Google Maps Platform / Google Places (foundational per Section 32)

1. What does the current Google Places API Terms of Service allow for
   **caching duration** of place details (name, address, hours, rating,
   photos) — is there a maximum TTL before a fresh API call is required?
2. Are we allowed to **store derived fields** (e.g., our own feasibility
   confidence score, accessibility annotations, community reports) attached
   to a Google Place ID indefinitely, even if the underlying Places record
   itself must expire from cache?
3. What are the **attribution requirements** for displaying Places-sourced
   data in quest cards, map pins, and search results?
4. Are we permitted to display **Google map tiles alongside a different
   provider's data layer** (e.g., our own fog-of-war overlay, community pins)
   — are there restrictions on "mixed-map display" as Section 32 phrases it?
5. What is the **pricing model at scale** for Places Nearby Search, Place
   Details, and Maps JavaScript SDK given expected viewport-query volume from
   Section 12's map-based discovery? Does this change the cost-budget targets
   in Section 40?
6. Is there a **field-level required refresh interval** for safety-relevant
   fields (hours, permanent closure status) that's stricter than the general
   cache policy?
7. What happens to **user-generated overlays** (reviews, photos, reports) tied
   to a Place ID if Google delists or merges that place record?

## Prior-art divergence: Mapbox / Leaflet / OpenStreetMap Overpass

8. The `questmap` prior art uses Mapbox (web tiles) and OpenStreetMap's
   Overpass API (POI discovery) instead of Google Places. Do we want Google
   Places as the **sole** place-data source, or Google Places as primary with
   OSM/Overpass as a **supplementary source** for sparse-data areas (Section
   31 explicitly anticipates needing fallback sources when place density is
   low)? This is a real product decision, not just a technical one — see
   `06-decision-log.md` DL-003.
9. If OSM/Overpass is retained as a fallback, what's the **attribution and
   ODbL license compliance** requirement for OpenStreetMap data mixed with
   Google-sourced data in the same product?

## Weather / daylight

10. Which provider (`questmap` prior art uses OpenWeather) — what are its
    rate limits, accuracy, and cost at the query volume implied by Section 16
    (Hearth mode weather triggers) and Section 20 (fog reveal by conditions)?

## AI / LLM provider

11. `questmap`'s prior art already integrates `@anthropic-ai/sdk`. Section 14
    never names a model vendor. Do we standardize on Anthropic models for
    Quest Forge / conversational guide / feasibility evaluator, and if so,
    what are the **per-request cost budgets** referenced in Section 40, and
    what's the **data retention/training-use policy** for user-submitted
    quest ideas and location context sent to the model?
12. Section 14 requires "input/output logging with privacy controls and
    retention rules" for AI systems — what retention period is legally
    required/permitted for logged AI conversations containing location and
    potentially child-adjacent data (family Hearth quests)?

## Payments (Stripe, per `questmap` prior art)

13. Section 5 explicitly excludes "in-app ticket or reservation purchasing"
    and "cash creator payouts" from MVP, and Section 33 defers "sponsored
    quests, affiliate bookings, paid creator packs, business campaigns" to
    future/Release 2 monetization. The `questmap` prior art already has a
    working Stripe integration with subscription tiers (Starter/Growth/
    Professional/Enterprise/Premium) and webhooks. **Should any of that be
    kept for later reuse, or is it out of scope until Release 2 monetization
    design actually happens?** (Building payment infrastructure before the
    product/business model that uses it is itself a risk — unused PCI-scope
    surface.)

## Notifications / push

14. `questmap` prior art uses `web-push` with VAPID keys for browser push.
    Confirm this is still the intended mechanism for the PWA notification
    types in Section 29, or whether a vendor service (e.g., a push
    notification platform) is preferred for delivery reliability/analytics.

## Storage

15. `questmap` prior art uses S3-compatible object storage for media. Section
    26 requires EXIF stripping by default on uploaded media — confirm this
    happens at upload time server-side (not client-side only, which can be
    bypassed) and whether the chosen storage provider's terms affect
    retention/deletion guarantees needed for the privacy export/erase
    requirements (Section 26, QB-183).

## General

16. What is the actual **product legal entity** (Section 50 already flags
    this as open) — this affects which jurisdiction's data-protection law
    (state privacy laws, COPPA, etc.) governs the retention matrix in Gate 1,
    and which insurance is needed for real-world activity recommendations
    (hiking, extreme sports content in "Trials of Might" guild).
17. Does the business have (or need) a relationship with Google (Maps
    Platform enterprise terms) versus using standard self-serve API keys,
    given the "foundational" designation and expected query volume?

None of these are answerable by engineering judgment alone — they need either
a live read of current provider ToS (which changes over time and should be
re-verified close to Gate 1, not assumed from training knowledge) or a legal
decision. Recommend assigning an owner per question in the decision log
before Gate 1 sign-off.
