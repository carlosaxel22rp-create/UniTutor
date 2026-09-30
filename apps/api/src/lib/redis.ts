import { Redis } from 'ioredis'
import { env } from '../config/env.js'
import { logger } from './logger.js'

/** Redis compartido entre instancias para rate limiting consistente. */
export const redis: Redis | null = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { enableAutoPipelining: true, maxRetriesPerRequest: 2, tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined })
  : null

redis?.on('error', (err) => logger.error({ err: err.message }, 'redis error'))
