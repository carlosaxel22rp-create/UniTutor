import type { NextFunction, Request, Response } from 'express'
import { Errors } from '../lib/errors.js'
import type { Role } from './authenticate.js'

/**
 * Middleware de AUTORIZACIÓN (RBAC).
 *
 *   router.post('/admin/…', requireRole('admin'), requireMfa, handler)
 *   router.post('/tutors/me/…', requireRole('tutor'), handler)
 *
 * Un tutor también es alumno (P2P): las rutas de alumno aceptan
 * 'student' y 'tutor'. Admin NO hereda automáticamente permisos de
 * participante en reservas ajenas (eso lo decide cada servicio).
 */
export function requireRole(...allowed: Role[]) {
  if (allowed.length === 0) throw new Error('requireRole necesita al menos un rol')
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(Errors.unauthorized())
    if (!allowed.includes(req.auth.role)) return next(Errors.forbidden())
    next()
  }
}

/** Exige sesión con MFA verificada (aal2). Obligatorio en rutas de admin. */
export function requireMfa(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(Errors.unauthorized())
  if (req.auth.aal !== 'aal2') return next(Errors.mfaRequired())
  next()
}
