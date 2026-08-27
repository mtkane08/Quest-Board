import { describe, expect, it } from 'vitest';
import { loadEnv, __resetEnvCacheForTests } from '../src/config/env.js';

describe('loadEnv', () => {
  it('accepts a minimal valid configuration and applies defaults', () => {
    __resetEnvCacheForTests();
    const env = loadEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      SESSION_SECRET: 'a'.repeat(20),
    });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3001);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
  });

  it('rejects a missing DATABASE_URL rather than booting with undefined config', () => {
    __resetEnvCacheForTests();
    expect(() =>
      loadEnv({
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'a'.repeat(20),
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a session secret shorter than 16 characters', () => {
    __resetEnvCacheForTests();
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'too-short',
      }),
    ).toThrow(/SESSION_SECRET/);
  });
});
