import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { Errors } from '../../lib/errors.js'
import { stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { requireRole } from '../../middleware/require-role.js'
import { valid, validate } from '../../middleware/validate.js'
import { deleteRoom } from '../../lib/daily.js'
import { notify, type BookingRow } from '../shared.js'

const Params = z.strictObject({ id: z.uuid() })
const CancelBody = z.strictObject({ reason: z.string().min(3).max(500) })

export const FREE_CANCEL_HOURS = 24

/**
 * Política de cancelación (se calcula SIEMPRE en servidor):
 *  - Tutor cancela               → 100 % al alumno.
 *  - Alumno cancela ≥ 24 h antes → 100 % al alumno.
 *  - Alumno cancela < 24 h antes → 0 %; late_cancellation = true y el
 *    tutor recibe su pago (el job de payouts lo incluye).
 */
export function refundFor(b: Pick<BookingRow, 'price_cents' | 'start_at' | 'tutor_id'>, actorId: string, nowMs = Date.now()) {
  if (actorId === b.tutor_id) return { refund: b.price_cents, late: false }
  const hours = (new Date(b.start_at).getTime() - nowMs) / 3_600_000
  return hours >= FREE_CANCEL_HOURS ? { refund: b.price_cents, late: false } : { refund: 0, late: true }
}

export function bookingRoutes(limiter: RequestHandler) {
  const r = Router()

  /** POST /v1/bookings/:id/cancel  { reason } */
  r.post(
    '/bookings/:id/cancel',
    requireRole('student', 'tutor'),
    limiter,
    validate('params', Params),
    validate('body', CancelBody),
    async (req, res, next) => {
      try {
        const { id } = valid<{ id: string }>(req, 'params')
        const { reason } = valid<{ reason: string }>(req, 'body')
        const uid = req.auth!.id

        const { data: b } = await supabaseAdmin
          .from('bookings')
          .select('*, payment:payments(stripe_payment_intent_id)')
          .eq('id', id)
          .maybeSingle<BookingRow & { payment: { stripe_payment_intent_id: string | null } | null }>()
        if (!b || (b.student_id !== uid && b.tutor_id !== uid)) throw Errors.notFound('Sesión no encontrada')

        if (b.status === 'pending_payment') {
          await supabaseAdmin.from('bookings').update({ status: 'expired', cancelled_by: uid }).eq('id', id).eq('status', 'pending_payment')
          return res.json({ status: 'expired', refundCents: 0 })
        }
        if (b.status !== 'confirmed') throw Errors.conflict('Esta sesión ya no se puede cancelar', 'not_cancellable')
        if (new Date(b.start_at).getTime() <= Date.now()) throw Errors.conflict('La sesión ya comenzó', 'already_started')

        const { refund, late } = refundFor(b, uid)

        // Transición condicional: si dos cancelaciones llegan juntas, solo una gana
        const { data: won } = await supabaseAdmin
          .from('bookings')
          .update({ status: 'cancelled', cancelled_by: uid, cancellation_reason: reason, late_cancellation: late })
          .eq('id', id)
          .eq('status', 'confirmed')
          .select('id')
        if (!won?.length) throw Errors.conflict('La sesión cambió de estado; recarga la página', 'stale_state')

        if (refund > 0 && b.payment?.stripe_payment_intent_id) {
          await stripe.refunds.create(
            { payment_intent: b.payment.stripe_payment_intent_id, amount: refund, metadata: { booking_id: id } },
            { idempotencyKey: `cancel-${id}` },
          )
          await supabaseAdmin.from('bookings').update({ status: 'refunded' }).eq('id', id).eq('status', 'cancelled')
        }
        if (b.video_room_name) await deleteRoom(b.video_room_name).catch(() => undefined)

        const other = uid === b.student_id ? b.tutor_id : b.student_id
        await notify([{ userId: other, type: 'booking_cancelled', title: 'Una sesión fue cancelada', body: reason, bookingId: id }])

        res.json({ status: refund > 0 ? 'refunded' : 'cancelled', refundCents: refund, lateCancellation: late })
      } catch (err) {
        next(err)
      }
    },
  )

  return r
}
