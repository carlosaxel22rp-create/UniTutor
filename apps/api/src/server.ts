import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { redis } from './lib/redis.js'
import { supabaseAdmin } from './lib/supabase.js'
import { createAuthenticate, supabaseTokenVerifier, type Role } from './middleware/authenticate.js'

const authenticate = createAuthenticate({
  verifyToken: supabaseTokenVerifier({ supabaseUrl: env.SUPABASE_URL, legacySecret: env.SUPABASE_JWT_SECRET }),
  loadUser: async (id) => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('email, role, status')
      .eq('id', id)
      .maybeSingle<{ email: string; role: Role; status: 'active' | 'suspended' | 'banned' }>()
    if (error) throw error
    return data
  },
})

const app = createApp({
  production: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGINS,
  authenticate,
  redis,
})

const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'EduConnect API escuchando'))

// Evita slowloris y conexiones colgadas
server.headersTimeout = 15_000
server.requestTimeout = 30_000
server.keepAliveTimeout = 65_000

const shutdown = (signal: string) => {
  logger.info({ signal }, 'cerrando')
  server.close(() => {
    redis?.disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
