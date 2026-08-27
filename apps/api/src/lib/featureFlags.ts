import type { Pool } from 'pg';

/**
 * Feature flags are rows in the `feature_flags` table (migration 0001) so
 * they can change without a deploy, per Section 36's "feature flags" as a
 * Gate 2 Foundation deliverable. A short in-memory cache avoids a DB round
 * trip on every request while keeping changes visible within a few seconds.
 */
const CACHE_TTL_MS = 30_000;

export interface FeatureFlagService {
  isEnabled(key: string): Promise<boolean>;
  invalidate(): void;
}

export function createFeatureFlagService(pool: Pool): FeatureFlagService {
  let cache: Map<string, boolean> | undefined;
  let cachedAt = 0;

  async function loadAll(): Promise<Map<string, boolean>> {
    const now = Date.now();
    if (cache && now - cachedAt < CACHE_TTL_MS) return cache;
    const result = await pool.query<{ key: string; is_enabled: boolean }>(
      'SELECT key, is_enabled FROM feature_flags',
    );
    cache = new Map(result.rows.map((row) => [row.key, row.is_enabled]));
    cachedAt = now;
    return cache;
  }

  return {
    async isEnabled(key: string): Promise<boolean> {
      const flags = await loadAll();
      return flags.get(key) ?? false;
    },
    invalidate(): void {
      cache = undefined;
    },
  };
}
