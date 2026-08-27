import type { Express } from 'express';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { loadEnv, __resetEnvCacheForTests } from '../../src/config/env.js';
import { createPool } from '../../src/db/client.js';
import { createRedisClient } from '../../src/db/redis.js';
import { createLogger } from '../../src/lib/logger.js';
import { StubAiProvider } from '../../src/providers/ai/StubAiProvider.js';
import { StubPlacesProvider } from '../../src/providers/places/StubPlacesProvider.js';

/**
 * Integration tests run against the real Postgres/Redis from
 * docker-compose.yml (or CI's service containers) — not mocks — because
 * the thing worth verifying at Gate 2 is that migrations, sessions, and
 * queries actually work end to end, per Section 44's contract-test intent.
 * `pool` is exposed so a test can set up fixture state (e.g. granting an
 * admin role) that has no self-service API yet.
 */
export async function buildTestApp(): Promise<{ app: Express; pool: Pool; teardown: () => Promise<void> }> {
  __resetEnvCacheForTests();
  const env = loadEnv({
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ?? 'postgresql://questboard:questboard_dev@localhost:5432/questboard',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    SESSION_SECRET: process.env.SESSION_SECRET ?? 'test-session-secret-please-ignore',
  });
  const logger = createLogger('error');
  const pool = createPool(env);
  const redis = createRedisClient(env);

  const app = createApp({
    env,
    pool,
    redis,
    logger,
    placesProvider: new StubPlacesProvider(),
    aiProvider: new StubAiProvider(),
  });

  return {
    app,
    pool,
    teardown: async () => {
      await pool.end();
      redis.disconnect();
    },
  };
}

export async function isDatabaseReachable(): Promise<boolean> {
  const { app, teardown } = await buildTestApp();
  void app;
  try {
    const request = (await import('supertest')).default;
    const res = await request(app).get('/health');
    return res.body?.checks?.database === 'ok' && res.body?.checks?.redis === 'ok';
  } catch {
    return false;
  } finally {
    await teardown();
  }
}
