import type { CookieOptions } from 'express-session';
import type { Env } from './env.js';

/**
 * Extracted as a pure function specifically so the cross-site cookie
 * behavior is unit-testable without spinning up the whole app — this is
 * exactly the kind of thing that looks fine in local dev (web and API
 * share a site there) and silently breaks every authenticated request the
 * moment the API and web app land on unrelated subdomains in a real
 * deployment (see the comment in app.ts for the full reasoning).
 */
export function buildSessionCookieOptions(env: Pick<Env, 'NODE_ENV' | 'COOKIE_DOMAIN'>): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  };
}
