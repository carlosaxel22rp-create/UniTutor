import type { AuthUser } from '../middleware/authenticate.js'

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado (lo coloca el middleware authenticate). */
      auth?: AuthUser
      /** Datos ya validados por zod (body/params/query). Usar SIEMPRE estos, nunca req.body crudo. */
      valid: { body?: unknown; params?: unknown; query?: unknown }
    }
  }
}

export {}
