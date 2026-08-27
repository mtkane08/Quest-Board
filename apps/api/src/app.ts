import RedisStore from 'connect-redis';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import { buildSessionCookieOptions } from './config/cookieOptions.js';
import type { Env } from './config/env.js';
import { AppError } from './lib/errors.js';
import { createFeatureFlagService } from './lib/featureFlags.js';
import type { Logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { aiRateLimit, generalRateLimit } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { adminRoutes } from './modules/admin/routes.js';
import { attemptsRoutes } from './modules/attempts/routes.js';
import { discoveryRoutes } from './modules/discovery/routes.js';
import { explorationRoutes } from './modules/exploration/routes.js';
import { generationRoutes } from './modules/generation/routes.js';
import { hearthRoutes } from './modules/hearth/routes.js';
import { identityRoutes } from './modules/identity/routes.js';
import { moderationRoutes } from './modules/moderation/routes.js';
import { invitationsRoutes, partiesRoutes } from './modules/parties/routes.js';
import { privacyRoutes } from './modules/privacy/routes.js';
import { progressionRoutes } from './modules/progression/routes.js';
import { questCatalogRoutes } from './modules/quest-catalog/routes.js';
import { reportsRoutes } from './modules/reports/routes.js';
import { taxonomyRoutes } from './modules/taxonomy/routes.js';
import type { AiGenerationProvider } from './providers/ai/AiGenerationProvider.js';
import type { PlacesProvider } from './providers/places/PlacesProvider.js';

export interface AppDependencies {
  env: Env;
  pool: Pool;
  redis: Redis;
  logger: Logger;
  placesProvider: PlacesProvider;
  aiProvider: AiGenerationProvider;
}

export function createApp(deps: AppDependencies): Express {
  const { env, pool, redis, logger, placesProvider, aiProvider } = deps;
  const app = express();
  const featureFlags = createFeatureFlagService(pool);

  app.use(requestId());
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    session({
      store: new RedisStore({ client: redis, prefix: 'qb:sess:' }),
      name: env.SESSION_COOKIE_NAME,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: buildSessionCookieOptions(env),
    }),
  );
  app.use(generalRateLimit);

  // Vertical health/demo path (Gate 2 exit criterion): proves the API can
  // reach Postgres and Redis, and reports each external provider's
  // configured/degraded status per Section 42's graceful-degradation rule.
  app.get('/health', async (_req, res) => {
    const checks: Record<string, 'ok' | 'degraded' | 'error'> = {};

    try {
      await pool.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    checks.placesProvider = placesProvider.isConfigured ? 'ok' : 'degraded';
    checks.aiProvider = aiProvider.isConfigured ? 'ok' : 'degraded';

    const hasError = Object.values(checks).includes('error');
    res.status(hasError ? 503 : 200).json({ status: hasError ? 'error' : 'ok', checks });
  });

  app.get('/feature-flags/:key', async (req, res, next) => {
    try {
      const enabled = await featureFlags.isEnabled(req.params.key);
      res.json({ key: req.params.key, enabled });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/v1/auth', identityRoutes(pool));
  app.use('/api/v1/taxonomy', taxonomyRoutes(pool));
  app.use('/api/v1/discovery', discoveryRoutes(pool, placesProvider));
  app.use('/api/v1/quests', questCatalogRoutes(pool));
  app.use('/api/v1/ai', aiRateLimit, generationRoutes(pool, aiProvider));
  app.use('/api/v1/moderation', moderationRoutes(pool));
  app.use('/api/v1/attempts', attemptsRoutes(pool));
  app.use('/api/v1/progression', progressionRoutes(pool));
  app.use('/api/v1/hearth', hearthRoutes(pool));
  app.use('/api/v1/reports', reportsRoutes(pool));
  app.use('/api/v1/admin', adminRoutes(pool));
  app.use('/api/v1/me', privacyRoutes(pool));
  app.use('/api/v1/parties', partiesRoutes(pool));
  app.use('/api/v1/invitations', invitationsRoutes(pool));
  app.use('/api/v1/exploration', explorationRoutes(pool));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use(errorHandler(logger));

  return app;
}

export { AppError };
