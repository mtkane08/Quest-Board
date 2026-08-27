import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

export function createRedisClient(env: Pick<Env, 'REDIS_URL'>): Redis {
  return new Redis(env.REDIS_URL, {
    // BullMQ (ADR-004) requires this when the same connection config is
    // reused for queues later; harmless for plain cache use meanwhile.
    maxRetriesPerRequest: null,
  });
}
