import type { NextFunction, Request, Response } from 'express'
import { Errors } from '../lib/errors.js'

/**
 * Exige HTTPS detrás del proxy de Render (x-forwarded-proto).
 * TLS 1.2+/1.3 lo termina la plataforma; aquí evitamos que una petición
 * HTTP plana llegue a la lógica de negocio.
 */
export function requireHttps(enabled: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled || req.secure) return next()
    res.status(403).json({ error: { code: 'https_required', message: 'HTTPS requerido' } })
  }
}

/**
 * Métodos que mutan estado solo aceptan application/json.
 * Un formulario HTML entre sitios (text/plain, form-urlencoded) no puede
 * enviar JSON sin preflight CORS → bloquea CSRF "simple request".
 */
export function requireJsonForMutations(req: Request, _res: Response, next: NextFunction) {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
  if (!mutating) return next()
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined
  if (hasBody && !req.is('application/json')) return next(Errors.unsupportedMedia())
  next()
}

/** Respuestas con datos personales o tokens no deben cachearse. */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  next()
}
