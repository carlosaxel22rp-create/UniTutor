import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express, { type RequestHandler } from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import type { Redis } from 'ioredis'
import { logger } from './lib/logger.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import { buildLimiters } from './middleware/rate-limit.js'
import { sanitizeBody } from './middleware/sanitize.js'
import { requireHttps, requireJsonForMutations } from './middleware/transport.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { bookingRoutes } from './modules/bookings/bookings.routes.js'
import { checkoutRoutes } from './modules/checkout/checkout.routes.js'
import { stripeWebhookRouter } from './modules/payments/stripe-webhook.js'
import { tutorRoutes } from './modules/tutors/tutors.routes.js'
import { dailyWebhookRouter, videoRoutes } from './modules/video/video.routes.js'

export interface AppConfig {
  production: boolean
  corsOrigins: string[]
  authenticate: RequestHandler
  redis: Redis | null
}

/**
 * Orden de middlewares (importa):
 *  1. transporte/cabeceras  → HTTPS, helmet, CORS, request-id, logs
 *  2. webhooks              → cuerpo RAW + firma (antes del parser JSON)
 *  3. parser JSON limitado  → 20 kB
 *  4. rate limit global     → por IP
 *  5. content-type + sanitización
 *  6. /v1 autenticado       → authenticate → (requireRole + limiter por ruta) → validate(zod) → handler
 *  7. 404 + errores
 */
export function createApp(cfg: AppConfig) {
  const app = express()
  const limiters = buildLimiters(cfg.redis)

  app.disable('x-powered-by')
  app.set('trust proxy', 1) // 1 salto: el proxy de Render → req.ip y req.secure correctos

  app.use(requireHttps(cfg.production))
  app.use(
    helmet({
      // API JSON: no sirve HTML ni scripts
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  )
  app.use(
    cors({
      origin: (origin, cb) => {
        // Sin Origin = servidor a servidor (webhooks, jobs). Con Origin: allowlist exacta.
        if (!origin || cfg.corsOrigins.includes(origin)) return cb(null, true)
        cb(null, false)
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      credentials: false, // sin cookies → sin CSRF
      maxAge: 600,
    }),
  )
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID()
        res.setHeader('X-Request-Id', id)
        return id
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  )

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // Webhooks: sin JWT, autenticados por firma
  app.use('/webhooks', stripeWebhookRouter(), dailyWebhookRouter())

  app.use(express.json({ limit: '20kb', strict: true }))
  app.use(limiters.global)
  app.use(requireJsonForMutations)
  app.use(sanitizeBody)
  app.use((req, _res, next) => {
    req.valid = {}
    next()
  })

  const v1 = express.Router()
  v1.use(cfg.authenticate)
  v1.use(checkoutRoutes(limiters.checkout))
  v1.use(bookingRoutes(limiters.payments))
  v1.use(videoRoutes(limiters.video))
  v1.use(tutorRoutes(limiters.payments))
  v1.use(adminRoutes(limiters.admin))
  app.use('/v1', v1)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
