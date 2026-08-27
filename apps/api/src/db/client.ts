import pg from 'pg';
import type { Env } from '../config/env.js';

export function createPool(env: Pick<Env, 'DATABASE_URL'>): pg.Pool {
  return new pg.Pool({ connectionString: env.DATABASE_URL });
}
