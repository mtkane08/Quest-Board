import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('offline quest packets (Section 30, Gate 7, requires `npm run db:seed`)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('returns a self-contained packet with a fresh generation timestamp', async () => {
    const list = await request(ctx.app).get('/api/v1/discovery/list').query({ limit: 1 });
    const questId = list.body.results[0].questId;

    const packetRes = await request(ctx.app).get(`/api/v1/quests/${questId}/packet`);
    expect(packetRes.status).toBe(200);
    const packet = packetRes.body.packet;
    expect(packet.questId).toBe(questId);
    expect(packet.objectives.length).toBeGreaterThan(0);
    expect(new Date(packet.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('404s for a quest that is not published (same visibility rule as the ordinary detail endpoint)', async () => {
    const res = await request(ctx.app).get('/api/v1/quests/00000000-0000-0000-0000-000000000000/packet');
    expect(res.status).toBe(404);
  });
});
