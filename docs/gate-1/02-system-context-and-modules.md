# Gate 1 — System Context and Module Diagrams

## System context

```mermaid
flowchart LR
    subgraph Actors
        Guest["Guest"]
        User["Adventurer / Guardian / Household"]
        Creator["Creator"]
        Biz["Business / Org / Tourism manager"]
        Mod["Trusted reviewer / Moderator / Admin"]
    end

    subgraph QB["Quest Board (modular monolith)"]
        Web["Next.js PWA client"]
        API["TypeScript API (BFF)"]
        DB[("PostgreSQL + PostGIS")]
        Cache[("Redis: cache + BullMQ jobs")]
        Storage[("S3-compatible object storage")]
    end

    subgraph External["External providers (behind adapters)"]
        Places["Google Maps Platform / Places"]
        Weather["Weather/daylight provider (TBD, Gate 2)"]
        AI["AI generation provider (TBD, Gate 2)"]
        Push["Email / Web-push provider"]
    end

    Guest -->|browse, search, guest quest| Web
    User --> Web
    Creator --> Web
    Biz --> Web
    Mod --> Web

    Web <--> API
    API <--> DB
    API <--> Cache
    API <--> Storage

    API -->|place search/details, map tiles| Places
    API -->|weather/daylight lookups| Weather
    API -->|quest generation, feasibility, moderation, translation| AI
    API -->|notifications| Push
```

No payment provider appears here — Release 1/1.1 has no monetization surface
(Gate 0 decision log DL-004, DL-012). It's added at the Release 2 gate when
Section 33's monetization is actually designed.

## Module boundaries (internal to the API service)

Directly from Section 36's architectural-boundaries list. Arrows show the
*allowed* call direction; a module may only call another through its
published interface, never its internals (ADR-001).

```mermaid
flowchart TB
    Identity["Identity & Authorization"]
    Taxonomy["Taxonomy / Configuration / Feature Flags"]
    Catalog["Quest Catalog & Versioning"]
    Discovery["Discovery / Recommendation"]
    PlacesCache["Places / Provider Cache"]
    Generation["Generation / Orchestration (AI)"]
    Feasibility["Feasibility / Provenance"]
    Attempts["Attempts / Completion / Evidence"]
    Social["Social / Parties"]
    Progression["Progression / Rewards"]
    Moderation["Moderation / Safety"]
    Orgs["Organizations / Businesses"]
    Notifications["Notifications"]
    Analytics["Analytics / Audit"]

    Discovery --> Catalog
    Discovery --> PlacesCache
    Discovery --> Feasibility
    Generation --> Catalog
    Generation --> Feasibility
    Generation --> PlacesCache
    Feasibility --> PlacesCache
    Catalog --> Feasibility
    Catalog --> Moderation
    Attempts --> Catalog
    Attempts --> Progression
    Social --> Attempts
    Social --> Identity
    Orgs --> Catalog
    Orgs --> Moderation
    Moderation --> Identity
    Progression --> Identity
    Notifications --> Identity
    Notifications --> Social
    Notifications --> Progression

    Identity -.->|read-only, all modules| Analytics
    Catalog -.-> Analytics
    Attempts -.-> Analytics
    Moderation -.-> Analytics
```

Notes:

- **Identity & Authorization** and **Taxonomy/Config/Feature Flags** are
  depended on by nearly everything and depend on nothing else — they're the
  foundation modules built at Gate 2.
- **Analytics/Audit** only ever receives events (dotted arrows) — it never
  calls back into another module, which keeps audit logging from becoming a
  hidden coupling point.
- **Places/Provider Cache** is the only module allowed to call the Google
  adapter (ADR-005); Discovery, Generation, and Feasibility consume it, they
  never call Google directly.
- **Generation/Orchestration** (the AI layer, ADR-006) depends on Catalog
  (to write structured drafts), Feasibility (to gate what it's allowed to
  suggest as confirmed), and Places/Provider Cache (as factual grounding
  context) — it never calls Attempts, Progression, or Social directly, which
  keeps the "AI cannot grant rewards or publish socially" boundary structural
  rather than just a code-review rule.
- **Moderation/Safety** can act on Catalog (suspend a quest) and Orgs
  (suspend a business claim) but Catalog/Orgs cannot bypass it — publish-state
  transitions always route through Moderation's authorization check.

## Vertical slice mapping (Gates 2-7 → modules touched)

| Gate | Slice | Primary modules |
|---|---|---|
| 2 | Foundation | Identity, Taxonomy/Config, Analytics/Audit (skeleton) |
| 3 | Discovery vertical slice | Discovery, Places/Provider Cache, Catalog (read path) |
| 4 | Forge and feasibility | Generation, Feasibility, Catalog (write path), Moderation (submission) |
| 5 | Attempts and Hearth | Attempts, Progression, Catalog (Hearth quests) |
| 6 | Community safety | Social, Moderation (full), Orgs (claims foundation), Identity (privacy export/erase) |
| 7 | Exploration and hardening | Discovery (fog), Analytics (readiness scoring), cross-cutting security/perf |

This gives each gate a bounded, reviewable set of modules rather than
touching the whole system every milestone, consistent with Section 47's
"one vertical, testable milestone at a time."
