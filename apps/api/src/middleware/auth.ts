import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import 'express-session';
import { Errors } from '../lib/errors.js';
import { userHasPermission } from '../modules/identity/service.js';
import type { AccessLevel } from '../modules/identity/types.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isGuest?: boolean;
    /** QB-001: guests may generate exactly one private AI quest without an account. */
    guestGenerationCount?: number;
  }
}

export function requireAuth() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(Errors.unauthorized());
      return;
    }
    next();
  };
}

/**
 * ADR-008: every authorization-sensitive route declares the
 * (action, entity, access) tuple it requires and checks it centrally here,
 * rather than each route hand-rolling its own check (the pattern the
 * threat model, docs/gate-1/09-threat-model.md #14, calls out as the
 * mitigation for privilege-escalation bugs).
 */
export function requirePermission(pool: Pool, action: string, entity: string, access: AccessLevel) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(Errors.unauthorized());
      return;
    }
    const allowed = await userHasPermission(pool, req.session.userId, action, entity, access);
    if (!allowed) {
      next(Errors.forbidden(action, entity));
      return;
    }
    next();
  };
}
