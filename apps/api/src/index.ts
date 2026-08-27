import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createPool } from './db/client.js';
import { createRedisClient } from './db/redis.js';
import { createLogger } from './lib/logger.js';
import { createAiProvider } from './providers/ai/StubAiProvider.js';
import { createPlacesProvider } from './providers/places/StubPlacesProvider.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const pool = createPool(env);
const redis = createRedisClient(env);
const placesProvider = createPlacesProvider(env.GOOGLE_PLACES_SERVER_API_KEY);
const aiProvider = createAiProvider(env.AI_PROVIDER_API_KEY);

const app = createApp({ env, pool, redis, logger, placesProvider, aiProvider });

const server = app.listen(env.PORT, () => {
  logger.info('quest-board api listening', {
    port: env.PORT,
    placesConfigured: placesProvider.isConfigured,
    aiConfigured: aiProvider.isConfigured,
  });
});

async function shutdown(signal: string) {
  logger.info('shutting down', { signal });
  server.close();
  await pool.end();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
