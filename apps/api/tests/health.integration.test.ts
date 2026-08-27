import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, isDatabaseReachable } from './helpers/testApp.js';

const dbReachable = await isDatabaseReachable();

describe.skipIf(!dbReachable)('GET /health (integration)', () => {
  let ctx: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reports ok for database and redis, and degraded (not error) for unconfigured providers', async () => {
    const res = await request(ctx.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
    expect(res.body.checks.placesProvider).toBe('degraded');
    expect(res.body.checks.aiProvider).toBe('degraded');
  });
});

if (!dbReachable) {
  console.warn(
    '[health.integration.test] Postgres/Redis not reachable at localhost — ' +
      'run `docker-compose up -d postgres redis` and `npm run db:migrate` first. Skipping.',
  );
}
