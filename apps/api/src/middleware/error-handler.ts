import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

/**
 * Manejador global: respuestas consistentes y SIN detalles internos
 * (sin stack, sin SQL, sin mensajes de Stripe). El detalle va al log
 * con un requestId para correlacionar.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { id?: string }).id

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, requestId }, err.message)
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details, requestId } })
    return
  }

  // body-parser: JSON malformado o demasiado grande
  const e = err as { type?: string; status?: number }
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_json', message: 'JSON inválido', requestId } })
    return
  }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Solicitud demasiado grande', requestId } })
    return
  }

  logger.error({ err, requestId }, 'unhandled error')
  res.status(500).json({ error: { code: 'internal', message: 'Error interno', requestId } })
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta no encontrada' } })
}
