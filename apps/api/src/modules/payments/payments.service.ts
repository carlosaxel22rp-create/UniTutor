import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { PG } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { notify, type BookingRow } from '../shared.js'
import { provisionRoom } from '../video/video.service.js'

interface PaymentRow {
  id: string
  student_id: string
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  amount_cents: number
  currency: string
  status: string
}

const chargeIdOf = (pi: Stripe.PaymentIntent) =>
  typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null

/**
 * payment_intent.succeeded
 *  - Verifica que el PI corresponda al payment y que el monto cobrado sea el esperado.
 *  - Confirma reservas en hold. Si un hold ya había expirado y el slot fue
 *    tomado por otro alumno (23P01), reembolsa ESA parte automáticamente.
 *  - Crea salas Daily y notifica a ambas partes.
 * Idempotente: las transiciones son condicionales sobre el estado previo.
 */
export async function onPaymentSucceeded(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata.payment_id
  if (!paymentId) return logger.warn({ pi: pi.id }, 'PI sin payment_id en metadata')

  const { data: p } = await supabaseAdmin.from('payments').select('*').eq('id', paymentId).maybeSingle<PaymentRow>()
  if (!p || p.stripe_payment_intent_id !== pi.id) return logger.error({ pi: pi.id }, 'PI no coincide con payment')
  if (pi.amount_received !== p.amount_cents || pi.currency !== p.currency) {
    logger.error({ pi: pi.id, expected: p.amount_cents, got: pi.amount_received }, 'Monto cobrado no coincide')
    return
  }

  await supabaseAdmin
    .from('payments')
    .update({ status: 'succeeded', stripe_charge_id: chargeIdOf(pi) })
    .eq('id', p.id)
    .in('status', ['requires_payment', 'processing', 'failed'])

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('payment_id', p.id)
    .in('status', ['pending_payment', 'expired'])
    .returns<BookingRow[]>()

  const confirmed: BookingRow[] = []
  const lost: BookingRow[] = []
  for (const b of bookings ?? []) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed', hold_expires_at: null })
      .eq('id', b.id)
      .in('status', ['pending_payment', 'expired'])
      .select('*')
      .returns<BookingRow[]>()
    if (error?.code === PG.EXCLUSION_VIOLATION) lost.push(b)
    else if (error) throw error
    else if (data?.[0]) confirmed.push(data[0])
  }

  if (lost.length) {
    const amount = lost.reduce((s, b) => s + b.price_cents, 0)
    await stripe.refunds.create(
      { payment_intent: pi.id, amount, reason: 'requested_by_customer', metadata: { payment_id: p.id, cause: 'hold_expired_slot_taken' } },
      { idempotencyKey: `late-hold-${pi.id}` },
    )
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'refunded', cancellation_reason: 'El horario fue tomado mientras se procesaba el pago' })
      .in('id', lost.map((b) => b.id))
    await notify([{ userId: p.student_id, type: 'booking_cancelled', title: 'Un horario ya no estaba disponible', body: 'Reembolsamos ese horario automáticamente.' }])
  }

  for (const b of confirmed) {
    try {
      await provisionRoom(b)
    } catch (err) {
      // No bloquea: la sala se crea bajo demanda al pedir el token
      logger.warn({ err, bookingId: b.id }, 'provisionRoom falló; se reintentará al unirse')
    }
    await notify([
      { userId: b.student_id, type: 'booking_confirmed', title: 'Sesión confirmada', bookingId: b.id },
      { userId: b.tutor_id, type: 'booking_confirmed', title: 'Nueva sesión reservada', bookingId: b.id },
    ])
  }
}

export async function onPaymentFailed(pi: Stripe.PaymentIntent) {
  // Las reservas siguen en hold hasta que expire: el alumno puede reintentar con otra tarjeta
  await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('stripe_payment_intent_id', pi.id).in('status', ['requires_payment', 'processing'])
}

/** charge.refunded: Stripe es la fuente de verdad del monto reembolsado. */
export async function onChargeRefunded(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!piId) return
  await supabaseAdmin
    .from('payments')
    .update({
      refunded_cents: charge.amount_refunded,
      status: charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded',
    })
    .eq('stripe_payment_intent_id', piId)
}

/**
 * charge.dispute.created (contracargo):
 *  - congela payouts pendientes de ese pago (bookings → disputed)
 *  - revierte transferencias ya emitidas
 */
export async function onDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id
  const { data: p } = await supabaseAdmin.from('payments').select('id').eq('stripe_charge_id', chargeId).maybeSingle<{ id: string }>()
  if (!p) return

  await supabaseAdmin.from('payments').update({ status: 'disputed' }).eq('id', p.id)
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'disputed', cancellation_reason: 'Contracargo bancario' })
    .eq('payment_id', p.id)
    .in('status', ['confirmed', 'in_progress', 'completed'])

  const { data: paid } = await supabaseAdmin
    .from('bookings')
    .select('id, stripe_transfer_id')
    .eq('payment_id', p.id)
    .eq('status', 'payout_released')
    .returns<{ id: string; stripe_transfer_id: string }[]>()
  for (const b of paid ?? []) {
    await stripe.transfers.createReversal(b.stripe_transfer_id, {}, { idempotencyKey: `reversal-${b.id}` })
    await supabaseAdmin.from('bookings').update({ status: 'disputed' }).eq('id', b.id)
  }
}

/** account.updated (webhook de Connect): habilita al tutor en el catálogo. */
export async function onAccountUpdated(account: Stripe.Account) {
  const ready = account.payouts_enabled === true && account.capabilities?.transfers === 'active'
  await supabaseAdmin.from('users').update({ payouts_enabled: ready }).eq('stripe_account_id', account.id)
}

/**
 * Transfiere al tutor el pago de UNA sesión (lo llama el job de payouts).
 * source_transaction liga la transferencia al cargo: no depende del saldo
 * disponible y Stripe la ejecuta cuando los fondos se liquidan.
 */
export async function releasePayout(b: BookingRow & { tutor_account: string; charge_id: string }) {
  const transfer = await stripe.transfers.create(
    {
      amount: b.tutor_payout_cents,
      currency: env.CURRENCY,
      destination: b.tutor_account,
      source_transaction: b.charge_id,
      transfer_group: b.payment_id ?? undefined,
      metadata: { booking_id: b.id },
    },
    { idempotencyKey: `payout-${b.id}` },
  )
  const { data } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'payout_released', stripe_transfer_id: transfer.id })
    .eq('id', b.id)
    .in('status', ['completed', 'cancelled'])
    .select('id')
  if (data?.length) {
    await notify([{ userId: b.tutor_id, type: 'payout_released', title: 'Pago liberado', body: `Recibirás $${(b.tutor_payout_cents / 100).toFixed(2)} MXN`, bookingId: b.id }])
  }
  return transfer.id
}
