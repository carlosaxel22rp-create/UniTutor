import type { Request } from 'express'
import { ipKeyGenerator, rateLimit, type Options, type Store } from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import type { Redis } from 'ioredis'

/**
 * Rate limiting por capas (A04/A07 — fuerza bruta, abuso, DDoS L7).
 *
 * - La protección volumétrica L3/L4 la da el edge (Vercel/Render/Cloudflare).
 * - El login/registro ocurre contra Supabase Auth: allí se configuran sus
 *   propios límites + CAPTCHA. Estos limitadores cubren NUESTRO API.
 * - Con Redis el contador es compartido entre instancias; sin Redis
 *   (solo local/test) se usa memoria.
 * - Clave = id de usuario si hay sesión (evita castigar NAT universitario),
 *   si no, IP normalizada (IPv6 agrupada en /56).
 */

type KeyBy = 'ip' | 'user'

interface LimiterConfig {
  name: string
  windowMs: number
  limit: number
  keyBy: KeyBy
  message?: string
}

function keyFor(req: Request, by: KeyBy): string {
  if (by === 'user' && req.auth?.id) return `u:${req.auth.id}`
  return `ip:${ipKeyGenerator(req.ip ?? '0.0.0.0')}`
}

export function createLimiterFactory(redis: Redis | null) {
  const makeStore = (prefix: string): Store | undefined =>
    redis
      ? new RedisStore({
          prefix: `rl:${prefix}:`,
          sendCommand: (command: string, ...args: string[]) =>
            redis.call(command, ...args) as Promise<RedisReply>,
        })
      : undefined

  return function createLimiter(cfg: LimiterConfig) {
    const options: Partial<Options> = {
      windowMs: cfg.windowMs,
      limit: cfg.limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (req) => keyFor(req, cfg.keyBy),
      handler: (_req, res, _next, opts) => {
        res.status(opts.statusCode).json({
          error: { code: 'rate_limited', message: cfg.message ?? 'Demasiadas solicitudes. Intenta más tarde.' },
        })
      },
      // Si Redis cae, preferimos rechazar a dejar pasar sin límite en rutas de dinero
      passOnStoreError: false,
    }
    const store = makeStore(cfg.name)
    if (store) options.store = store
    return rateLimit(options)
  }
}

/** Presets usados por las rutas. */
export function buildLimiters(redis: Redis | null) {
  const create = createLimiterFactory(redis)
  return {
    /** Toda la API: 300 req / 15 min por IP */
    global: create({ name: 'global', windowMs: 15 * 60_000, limit: 300, keyBy: 'ip' }),
    /** Endpoints previos a autenticación (p.ej. verificación de dominio): 5/min por IP */
    auth: create({ name: 'auth', windowMs: 60_000, limit: 5, keyBy: 'ip', message: 'Demasiados intentos. Espera un minuto.' }),
    /** Crear checkout: 10/min por usuario */
    checkout: create({ name: 'checkout', windowMs: 60_000, limit: 10, keyBy: 'user' }),
    /** Operaciones de pago/reembolso/cancelación: 20/h por usuario */
    payments: create({ name: 'payments', windowMs: 60 * 60_000, limit: 20, keyBy: 'user' }),
    /** Tokens de videollamada: 20/min por usuario */
    video: create({ name: 'video', windowMs: 60_000, limit: 20, keyBy: 'user' }),
    /** Acciones de admin: 60/min por usuario */
    admin: create({ name: 'admin', windowMs: 60_000, limit: 60, keyBy: 'user' }),
  }
}
