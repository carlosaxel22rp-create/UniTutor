import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { Errors } from '../lib/errors.js'

export type Role = 'student' | 'tutor' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: Role
  /** Nivel de autenticación de Supabase: aal2 = sesión con MFA verificada */
  aal: 'aal1' | 'aal2'
  sessionId: string | null
}

export interface AuthDeps {
  /** Verifica firma, expiración, emisor y audiencia del JWT. Lanza si es inválido. */
  verifyToken: (token: string) => Promise<JWTPayload>
  /** Lee rol y estado FRESCOS desde la BD (no confiar en el claim del JWT). */
  loadUser: (id: string) => Promise<{ email: string; role: Role; status: 'active' | 'suspended' | 'banned' } | null>
}

const BEARER_RE = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INSTITUTIONAL_RE = /^[a-z0-9._%+-]+@utom\.edu\.mx$/

/**
 * Middleware de AUTENTICACIÓN.
 *  1. Extrae el Bearer token (formato JWT estricto; sin cookies → sin CSRF).
 *  2. Verifica firma con el JWKS de Supabase (ES256/RS256) o secreto HS256
 *     legado, más `exp`, `iss` y `aud = authenticated`.
 *  3. Consulta rol/estado actual en BD → una suspensión surte efecto inmediato.
 *  4. Revalida el dominio institucional (defensa en profundidad).
 */
export function createAuthenticate(deps: AuthDeps): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization
      const match = header ? BEARER_RE.exec(header) : null
      if (!match?.[1]) throw Errors.unauthorized()

      let payload: JWTPayload
      try {
        payload = await deps.verifyToken(match[1])
      } catch {
        // No distinguimos "expirado" de "firma inválida" hacia afuera
        throw Errors.unauthorized('Sesión inválida o expirada')
      }

      const sub = payload.sub
      if (!sub || !UUID_RE.test(sub)) throw Errors.unauthorized('Sesión inválida o expirada')
      if (payload.role !== 'authenticated') throw Errors.unauthorized('Sesión inválida o expirada')

      const user = await deps.loadUser(sub)
      if (!user) throw Errors.unauthorized('Sesión inválida o expirada')
      if (user.status !== 'active') throw Errors.forbidden('Tu cuenta no está activa')
      if (!INSTITUTIONAL_RE.test(user.email)) throw Errors.forbidden('Se requiere correo institucional')

      req.auth = {
        id: sub,
        email: user.email,
        role: user.role,
        aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
        sessionId: typeof payload.session_id === 'string' ? payload.session_id : null,
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

/** Verificador de producción basado en la configuración de Supabase. */
export function supabaseTokenVerifier(opts: { supabaseUrl: string; legacySecret?: string | undefined }) {
  const issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`
  const common = { issuer, audience: 'authenticated', clockTolerance: 5 } as const

  if (opts.legacySecret) {
    const key = new TextEncoder().encode(opts.legacySecret)
    return async (token: string) => (await jwtVerify(token, key, { ...common, algorithms: ['HS256'] })).payload
  }
  // Claves asimétricas: el JWKS se cachea y rota automáticamente
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { cooldownDuration: 30_000, cacheMaxAge: 600_000 })
  return async (token: string) => (await jwtVerify(token, jwks, { ...common, algorithms: ['ES256', 'RS256'] })).payload
}
