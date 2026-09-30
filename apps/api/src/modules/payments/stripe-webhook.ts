import express, { Router } from 'express'
import type Stripe from 'stripe'
import { env } from '../../config/env.js'
import { PG } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { onAccountUpdated, onChargeRefunded, onDisputeCreated, onPaymentFailed, onPaymentSucceeded } from './payments.service.js'

/**
 * POST /webhooks/stripe          → eventos de la cuenta de plataforma
 * POST /webhooks/stripe/connect  → eventos de cuentas conectadas (tutores)
 *
 * Seguridad (A08):
 *  - express.raw(): la firma se valida sobre el cuerpo EXACTO.
 *  - constructEvent verifica HMAC + tolerancia de 5 min (anti-replay).
 *  - Idempotencia con la tabla stripe_events (Stripe puede reenviar).
 *  - Nunca se confía en montos del evento sin cruzarlos con la BD.
 */
export function stripeWebhookRouter() {
  const r = Router()
  const raw = express.raw({ type: 'application/json', limit: '1mb' })

  const handler = (secret: string) => async (req: express.Request, res: express.Response) => {
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, req.get('stripe-signature') ?? '', secret)
    } catch {
      logger.warn({ ip: req.ip }, 'stripe webhook: firma inválida')
      return res.status(400).send('invalid signature')
    }

    // Idempotencia
    const { error: insErr } = await supabaseAdmin.from('stripe_events').insert({ id: event.id, type: event.type })
    if (insErr && insErr.code !== PG.UNIQUE_VIOLATION) {
      logger.error({ err: insErr }, 'stripe_events insert')
      return res.status(500).end()
    }
    if (insErr?.code === PG.UNIQUE_VIOLATION) {
      const { data } = await supabaseAdmin.from('stripe_events').select('processed_at').eq('id', event.id).single<{ processed_at: string | null }>()
      if (data?.processed_at) return res.status(200).json({ received: true, duplicate: true })
      // existe pero no terminó: se reprocesa (handlers idempotentes)
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await onPaymentSucceeded(event.data.object)
          break
        case 'payment_intent.payment_failed':
          await onPaymentFailed(event.data.object)
          break
        case 'charge.refunded':
          await onChargeRefunded(event.data.object)
          break
        case 'charge.dispute.created':
          await onDisputeCreated(event.data.object)
          break
        case 'account.updated':
          await onAccountUpdated(event.data.object)
          break
        default:
          break // eventos no suscritos: se aceptan y se ignoran
      }
      await supabaseAdmin.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id)
      res.status(200).json({ received: true })
    } catch (err) {
      logger.error({ err, eventId: event.id, type: event.type }, 'stripe webhook: error de procesamiento')
      res.status(500).end() // Stripe reintenta con backoff exponencial
    }
  }

  r.post('/stripe', raw, handler(env.STRIPE_WEBHOOK_SECRET))
  r.post('/stripe/connect', raw, handler(env.STRIPE_CONNECT_WEBHOOK_SECRET))
  return r
}
