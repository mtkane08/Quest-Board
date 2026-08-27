import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('discovery + quest-catalog routes (integration, requires `npm run db:seed`)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lists seeded quests near Boston, ordered by distance', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/discovery/list')
      .query({ lat: 42.3601, lng: -71.0589, radiusMeters: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    const distances = res.body.results
      .map((r: { distanceMeters: number | null }) => r.distanceMeters)
      .filter((d: number | null) => d !== null);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('excludes age-restricted quests by default', async () => {
    const res = await request(ctx.app).get('/api/v1/discovery/list').query({ limit: 50 });
    expect(res.status).toBe(200);
    const titles = res.body.results.map((r: { title: string }) => r.title);
    expect(titles).not.toContain('Brewery Flight & Trivia Night');
  });

  it('includes age-restricted quests only when explicitly opted in', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/discovery/list')
      .query({ limit: 50, includeAdultContent: 'true' as unknown as boolean });
    // includeAdultContent isn't in the query schema by design (Gate 3 has no
    // per-user age gate yet) — confirm it's silently ignored, not honored,
    // so the safe default can't be bypassed by an undocumented query param.
    expect(res.status).toBe(200);
    const titles = res.body.results.map((r: { title: string }) => r.title);
    expect(titles).not.toContain('Brewery Flight & Trivia Night');
  });

  it('never reports an accessible location as confirmed when the seed says unknown', async () => {
    const res = await request(ctx.app).get('/api/v1/discovery/list').query({ limit: 50 });
    const dateQuest = res.body.results.find(
      (r: { title: string }) => r.title === 'Riverside Sculpture Stroll for Two',
    );
    expect(dateQuest).toBeDefined();
    expect(dateQuest.accessibilityHighlights.wheelchair).toBe('unknown');
  });

  it('map results are a subset of list results, excluding quests with no coordinates', async () => {
    const [listRes, mapRes] = await Promise.all([
      request(ctx.app).get('/api/v1/discovery/list').query({ limit: 50 }),
      request(ctx.app).get('/api/v1/discovery/map').query({ limit: 50 }),
    ]);
    const listTitles = listRes.body.results.map((r: { title: string }) => r.title);
    const mapTitles = mapRes.body.results.map((r: { title: string }) => r.title);
    expect(listTitles).toContain('Pantry Alchemy: One-Pot Surprise'); // no location
    expect(mapTitles).not.toContain('Pantry Alchemy: One-Pot Surprise');
    for (const title of mapTitles) {
      expect(listTitles).toContain(title);
    }
  });

  it('geocode reports degraded rather than erroring when no provider key is configured', async () => {
    const res = await request(ctx.app).get('/api/v1/discovery/geocode').query({ query: 'Boston, MA' });
    expect(res.status).toBe(200);
    expect(res.body.degraded).toBe(true);
    expect(res.body.result).toBeNull();
  });

  it('quest detail exposes preflight-required fields before starting (QB-031)', async () => {
    const list = await request(ctx.app).get('/api/v1/discovery/list').query({ limit: 1 });
    const questId = list.body.results[0].questId;
    const detail = await request(ctx.app).get(`/api/v1/quests/${questId}`);
    expect(detail.status).toBe(200);
    const quest = detail.body.quest;
    expect(quest).toHaveProperty('safetyNotes');
    expect(quest).toHaveProperty('accessibilityProfile');
    expect(quest).toHaveProperty('riskRating');
    expect(quest).toHaveProperty('feasibilityConfidence');
    expect(quest).toHaveProperty('trustBadges');
  });

  it('returns 404 for an unknown quest id', async () => {
    const res = await request(ctx.app).get('/api/v1/quests/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
