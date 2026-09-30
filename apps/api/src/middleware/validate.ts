import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { Errors } from '../lib/errors.js'

type Part = 'body' | 'params' | 'query'

/**
 * Valida una parte de la petición con un esquema zod ESTRICTO
 * (z.strictObject rechaza campos extra → evita mass assignment, p.ej.
 * que un cliente mande `price_cents` o `status`).
 * El resultado queda en req.valid[part]; los handlers usan solo eso.
 */
export function validate<T>(part: Part, schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part])
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return next(Errors.badRequest('Datos inválidos', details))
    }
    req.valid ??= {}
    req.valid[part] = result.data
    next()
  }
}

/** Obtiene los datos validados con tipo. */
export function valid<T>(req: Request, part: Part): T {
  return req.valid[part] as T
}
