/**
 * Render Cron Job (cada 15 min): `npm run job:payouts`
 *
 * 1. Libera pagos a tutores (escrow → Transfer) de sesiones:
 *    - completed hace > 24 h (ventana para reportar problemas), o
 *    - cancelled tardíamente por el alumno (late_cancellation) y ya pasadas.
 *    Excluye pagos en disputa.
 * 2. Cierra sesiones cuyo webhook meeting.ended nunca llegó.
 * 3. Cancela PaymentIntents de checkouts abandonados (holds expirados).
 *
 * Cada paso es idempotente: se puede ejecutar dos veces sin pagar doble
 * (idempotencyKey en Stripe + transición condicional de estado en BD).
 */
import { logger } from '../lib/logger.js'
import { stripe } from '../lib/stripe.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { releasePayout } from '../modules/payments/payments.service.js'
import type { BookingRow } from '../modules/shared.js'
import { closeSession } from '../modules/video/video.service.js'

const DISPUTE_WINDOW_H = 24
const BATCH = 50

type PayoutCandidate = BookingRow & {
  tutor: { stripe_account_id: string | null; payouts_enabled: boolean } | null
  payment: { stripe_charge_id: string | null; status: string } | null
}

async function releaseDuePayouts() {
  const cutoff = new Date(Date.now() - DISPUTE_WINDOW_H * 3_600_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, tutor:users!bookings_tutor_id_fkey(stripe_account_id, payouts_enabled), payment:payments(stripe_charge_id, status)')
    .or(`and(status.eq.completed,end_at.lt.${cutoff}),and(status.eq.cancelled,late_cancellation.eq.true,end_at.lt.${new Date().toISOString()})`)
    .is('stripe_transfer_id', null)
    .limit(BATCH)
    .returns<PayoutCandidate[]>()
  if (error) throw error

  let ok = 0
  for (const b of data ?? []) {
    if (!b.tutor?.stripe_account_id || !b.tutor.payouts_enabled) continue
    if (!b.payment?.stripe_charge_id || b.payment.status === 'disputed') continue
    try {
      await releasePayout({ ...b, tutor_account: b.tutor.stripe_account_id, charge_id: b.payment.stripe_charge_id })
      ok++
    } catch (err) {
      logger.error({ err, bookingId: b.id }, 'payout failed')
    }
  }
  logger.info({ released: ok, candidates: data?.length ?? 0 }, 'payouts')
}

async function closeStaleSessions() {
  const cutoff = new Date(Date.now() - 30 * 60_000).toISOString()
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'in_progress'])
    .lt('end_at', cutoff)
    .limit(BATCH)
    .returns<BookingRow[]>()
  for (const b of data ?? []) await closeSession(b)
}

async function cancelAbandonedIntents() {
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString()
  const { data } = await supabaseAdmin
    .from('payments')
    .select('id, stripe_payment_intent_id, bookings(status)')
    .eq('status', 'requires_payment')
    .lt('created_at', cutoff)
    .not('stripe_payment_intent_id', 'is', null)
    .limit(BATCH)
    .returns<{ id: string; stripe_payment_intent_id: string; bookings: { status: string }[] }[]>()

  for (const p of data ?? []) {
    if (p.bookings.some((b) => b.status !== 'expired')) continue
    try {
      await stripe.paymentIntents.cancel(p.stripe_payment_intent_id, { cancellation_reason: 'abandoned' })
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', p.id).eq('status', 'requires_payment')
    } catch (err) {
      logger.warn({ err, paymentId: p.id }, 'cancel PI failed')
    }
  }
}

async function main() {
  await releaseDuePayouts()
  await closeStaleSessions()
  await cancelAbandonedIntents()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.fatal({ err }, 'job failed')
    process.exit(1)
  })
