import { Router, type RequestHandler } from 'express'
import { Errors } from '../../lib/errors.js'
import { requireRole } from '../../middleware/require-role.js'
import { noStore } from '../../middleware/transport.js'
import { valid, validate } from '../../middleware/validate.js'
import { CheckoutBody, IdempotencyHeader } from './checkout.schema.js'
import { createCheckout } from './checkout.service.js'

export function checkoutRoutes(limiter: RequestHandler) {
  const r = Router()

  /**
   * POST /v1/checkout
   * Headers: Authorization: Bearer <jwt>, Idempotency-Key: <uuid>
   * Body:    { tutorId, subjectId, slots: [ISO8601…] }
   */
  r.post('/checkout', requireRole('student', 'tutor'), limiter, noStore, validate('body', CheckoutBody), async (req, res, next) => {
    try {
      const key = IdempotencyHeader.safeParse(req.get('Idempotency-Key'))
      if (!key.success) throw Errors.badRequest('Header Idempotency-Key (UUID) requerido')

      const body = valid<CheckoutBody>(req, 'body')
      const result = await createCheckout({
        studentId: req.auth!.id,
        studentEmail: req.auth!.email,
        tutorId: body.tutorId,
        subjectId: body.subjectId,
        slots: body.slots,
        idempotencyKey: key.data,
      })
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  })

  return r
}
