import { z } from 'zod';

/**
 * All configuration enters the app through this schema so a missing/invalid
 * value fails fast at boot instead of surfacing as a confusing runtime bug
 * later (Section 40's observability requirements start with "don't let bad
 * config reach production silently").
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  SESSION_COOKIE_NAME: z.string().default('qb_session'),
  COOKIE_DOMAIN: z.string().default('localhost'),

  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),

  // Provider credentials are optional at Gate 2 — the adapters run in
  // stub/degraded mode when absent (ADR-005, ADR-006). Do not require them
  // to boot the Foundation vertical slice.
  GOOGLE_PLACES_SERVER_API_KEY: z.string().optional(),
  GOOGLE_MAPS_BROWSER_API_KEY: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_PROVIDER_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clears the cached env so a test can reload with different values. */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}
