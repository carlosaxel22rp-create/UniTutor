import Stripe from 'stripe'
import { env } from '../config/env.js'

/**
 * Cliente Stripe del lado del servidor. La API version queda fijada por la
 * versión del SDK instalada (actualizar ambos juntos y probar webhooks).
 * El número de tarjeta jamás llega a este servidor: el navegador lo envía
 * directo a Stripe mediante el Payment Element (PCI-DSS SAQ-A).
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  maxNetworkRetries: 2,
  timeout: 15_000,
  appInfo: { name: 'EduConnect', version: '1.0.0' },
})
