import { describe, expect, it } from 'vitest';
import { buildSessionCookieOptions } from '../src/config/cookieOptions.js';

describe('buildSessionCookieOptions (cross-site cookie correctness, Gate 7 deployment fix)', () => {
  it('uses Lax in development, where web and API share a site (same domain, different port)', () => {
    const options = buildSessionCookieOptions({ NODE_ENV: 'development', COOKIE_DOMAIN: undefined });
    expect(options.sameSite).toBe('lax');
    expect(options.secure).toBe(false);
  });

  it('uses None+Secure in production, required when the web app and API are on unrelated subdomains', () => {
    const options = buildSessionCookieOptions({ NODE_ENV: 'production', COOKIE_DOMAIN: undefined });
    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
  });

  it('never sets sameSite=none without secure=true — browsers reject that combination outright', () => {
    const dev = buildSessionCookieOptions({ NODE_ENV: 'development', COOKIE_DOMAIN: undefined });
    const prod = buildSessionCookieOptions({ NODE_ENV: 'production', COOKIE_DOMAIN: undefined });
    for (const options of [dev, prod]) {
      if (options.sameSite === 'none') expect(options.secure).toBe(true);
    }
  });

  it('leaves domain unset by default rather than defaulting to something that would silently not match the real host', () => {
    const options = buildSessionCookieOptions({ NODE_ENV: 'production', COOKIE_DOMAIN: undefined });
    expect(options.domain).toBeUndefined();
  });

  it('passes through an explicit COOKIE_DOMAIN when one is actually configured (shared-parent-domain deployments)', () => {
    const options = buildSessionCookieOptions({ NODE_ENV: 'production', COOKIE_DOMAIN: 'example.com' });
    expect(options.domain).toBe('example.com');
  });
});
