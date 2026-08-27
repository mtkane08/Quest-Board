import rateLimit from 'express-rate-limit';

/**
 * General API limiter. Auth endpoints get a stricter limiter (Section 39:
 * "strongest [rate limiting] on auth endpoints").
 */
export const generalRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Gate 7 hardening: Section 40 requires "defined per-quest AI and provider
 * cost budgets before public scale" and Section 39 flags "bot generation"
 * as a named threat. This is tighter than the general API limit
 * specifically because every request here is a (currently free, but not
 * forever) AI provider call — see docs/gate-0/06-decision-log.md DL-008.
 */
export const aiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});
