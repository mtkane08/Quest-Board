import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('taxonomy routes (integration, requires `npm run db:seed`)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lists the 4 realms from spec Section 8', async () => {
    const res = await request(ctx.app).get('/api/v1/taxonomy/realms');
    expect(res.status).toBe(200);
    expect(res.body.realms.length).toBeGreaterThanOrEqual(4);
  });

  it('lists the 12 guilds with plain-language subtitles', async () => {
    const res = await request(ctx.app).get('/api/v1/taxonomy/guilds');
    expect(res.status).toBe(200);
    expect(res.body.guilds.length).toBeGreaterThanOrEqual(12);
    const revels = res.body.guilds.find((g: { stable_key: string }) => g.stable_key === 'the_revels');
    expect(revels.safety_metadata.requires_age_gate).toBe(true);
  });
});
