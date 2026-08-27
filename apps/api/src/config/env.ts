import { z } from 'zod';
import { ensureUrlScheme } from './normalizeUrl.js';

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
  // No default, and no fallback to 'localhost': a `Domain` attribute only
  // makes sense when the API and web app share a parent domain (e.g. both
  // under yourapp.com). On a topology like Render's, where each service
  // gets its own unrelated *.onrender.com subdomain, setting any `Domain`
  // value would either not match the API's real host (silently dropping
  // the cookie) or scope it wider than intended — so this stays unset
  // (host-only cookie) unless a real shared parent domain exists.
  COOKIE_DOMAIN: z.string().optional(),

  // The default already carries an explicit scheme (local dev); a bare
  // hostname only reaches the fallback branch in a real deployment, where
  // Render (and any sane host) always serves over HTTPS.
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => ensureUrlScheme(v, 'https')),

  // Provider credentials are optional at Gate 2 — the adapters run in
  // stub/degraded mode when absent (ADR-005, ADR-006). Do not require them
  // to boot the Foundation vertical slice.
  GOOGLE_PLACES_SERVER_API_KEY: z.string().optional(),
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
