/**
 * Errores de dominio con código HTTP. El manejador global los traduce a
 * respuestas genéricas: nunca se filtran stack traces ni mensajes de BD.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  unauthorized: (msg = 'Autenticación requerida') => new AppError(401, 'unauthorized', msg),
  forbidden: (msg = 'No tienes permiso para esta acción') => new AppError(403, 'forbidden', msg),
  notFound: (msg = 'Recurso no encontrado') => new AppError(404, 'not_found', msg),
  conflict: (msg: string, code = 'conflict') => new AppError(409, code, msg),
  badRequest: (msg: string, details?: unknown) => new AppError(400, 'bad_request', msg, details),
  unprocessable: (msg: string) => new AppError(422, 'unprocessable', msg),
  unsupportedMedia: () => new AppError(415, 'unsupported_media_type', 'Content-Type debe ser application/json'),
  mfaRequired: () => new AppError(403, 'mfa_required', 'Esta acción requiere verificación en dos pasos'),
}

/** Códigos de PostgreSQL relevantes para traducir a errores de negocio. */
export const PG = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
  FOREIGN_KEY_VIOLATION: '23503',
  RAISE_EXCEPTION: 'P0001',
} as const
