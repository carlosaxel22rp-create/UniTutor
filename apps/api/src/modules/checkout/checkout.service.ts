import { env } from '../../config/env.js'
import { Errors, PG } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'

interface CheckoutRow {
  payment_id: string
  amount_cents: number
  hold_expires_at: string
  booking_ids: string[]
}

export interface CheckoutResult {
  paymentId: string
  clientSecret: string
  amountCents: number
  currency: string
  holdExpiresAt: string
  bookingIds: string[]
}

/**
 * "Pay & Schedule (N slots)" del Figma.
 *
 * 1. RPC create_checkout: crea payment + N bookings en una transacción,
 *    con precio de BD, validación de disponibilidad y anti doble-reserva.
 * 2. Crea/recupera el Customer de Stripe del alumno.
 * 3. Crea un PaymentIntent en la cuenta de la PLATAFORMA con
 *    transfer_group = payment_id  → modelo "separate charges & transfers":
 *    el dinero queda retenido y se transfiere a cada tutor por sesión.
 * 4. Devuelve solo el client_secret (el navegador confirma con Stripe).
 */
export async function createCheckout(input: {
  studentId: string
  studentEmail: string
  tutorId: string
  subjectId: number
  slots: string[]
  idempotencyKey: string
}): Promise<CheckoutResult> {
  if (input.tutorId === input.studentId) throw Errors.unprocessable('No puedes reservar contigo mismo')

  const { data, error } = await supabaseAdmin
    .rpc('create_checkout', {
      p_student: input.studentId,
      p_tutor: input.tutorId,
      p_subject: input.subjectId,
      p_slots: input.slots,
      p_idempotency_key: input.idempotencyKey,
      p_fee_bps: env.PLATFORM_FEE_BPS,
    })
    .single<CheckoutRow>()

  if (error) {
    if (error.code === PG.EXCLUSION_VIOLATION) throw Errors.conflict('Uno de los horarios ya fue reservado', 'slot_taken')
    if (error.code === PG.CHECK_VIOLATION || error.code === PG.RAISE_EXCEPTION) throw Errors.unprocessable(error.message)
    if (error.code === PG.FOREIGN_KEY_VIOLATION) throw Errors.unprocessable('Materia inválida')
    throw error
  }
  if (!data) throw new Error('create_checkout no devolvió datos')

  try {
    // ¿Ya existe PaymentIntent (reintento con el mismo Idempotency-Key)?
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('id', data.payment_id)
      .single<{ stripe_payment_intent_id: string | null }>()

    let clientSecret: string | null = null
    if (existing?.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id)
      clientSecret = pi.client_secret
    } else {
      const customerId = await ensureStripeCustomer(input.studentId, input.studentEmail)
      const pi = await stripe.paymentIntents.create(
        {
          amount: data.amount_cents,
          currency: env.CURRENCY,
          customer: customerId,
          automatic_payment_methods: { enabled: true },
          transfer_group: data.payment_id,
          description: `EduConnect · ${data.booking_ids.length} sesión(es) de tutoría`,
          metadata: { payment_id: data.payment_id, student_id: input.studentId, tutor_id: input.tutorId },
        },
        // Mismo payment_id ⇒ mismo PaymentIntent aunque el request se repita
        { idempotencyKey: `pi-${data.payment_id}` },
      )
      clientSecret = pi.client_secret
      const { error: upErr } = await supabaseAdmin
        .from('payments')
        .update({ stripe_payment_intent_id: pi.id })
        .eq('id', data.payment_id)
      if (upErr) throw upErr
    }
    if (!clientSecret) throw new Error('PaymentIntent sin client_secret')

    return {
      paymentId: data.payment_id,
      clientSecret,
      amountCents: data.amount_cents,
      currency: env.CURRENCY,
      holdExpiresAt: data.hold_expires_at,
      bookingIds: data.booking_ids,
    }
  } catch (err) {
    // Compensación: liberar los slots si Stripe falló
    logger.error({ err, paymentId: data.payment_id }, 'checkout: fallo con Stripe, liberando holds')
    await supabaseAdmin.from('bookings').update({ status: 'expired' }).eq('payment_id', data.payment_id).eq('status', 'pending_payment')
    await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', data.payment_id)
    throw err
  }
}

async function ensureStripeCustomer(userId: string, email: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single<{ stripe_customer_id: string | null }>()
  if (data?.stripe_customer_id) return data.stripe_customer_id

  const customer = await stripe.customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  )
  await supabaseAdmin.from('users').update({ stripe_customer_id: customer.id }).eq('id', userId).is('stripe_customer_id', null)
  return customer.id
}
