'use client'
import { createSupabaseBrowser } from './supabase/client'

/**
 * Cliente del API Express. Envía el JWT como Bearer (no cookies) →
 * el API no es susceptible a CSRF. Nunca envía precios ni estados:
 * solo intenciones (tutor, materia, horarios).
 */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const supabase = createSupabaseBrowser()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError(401, 'unauthorized', 'Inicia sesión de nuevo')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? 'Error inesperado')
  return body as T
}

export interface CheckoutResponse {
  paymentId: string
  clientSecret: string
  amountCents: number
  currency: string
  holdExpiresAt: string
  bookingIds: string[]
}

export const api = {
  checkout: (input: { tutorId: string; subjectId: number; slots: string[] }, idempotencyKey: string) =>
    call<CheckoutResponse>('/v1/checkout', { method: 'POST', body: JSON.stringify(input), idempotencyKey }),
  cancelBooking: (id: string, reason: string) =>
    call<{ status: string; refundCents: number }>(`/v1/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  videoToken: (id: string) =>
    call<{ roomUrl: string; token: string; expiresAt: string }>(`/v1/bookings/${encodeURIComponent(id)}/video-token`, { method: 'POST' }),
  stripeOnboarding: () => call<{ url: string }>('/v1/tutors/me/stripe/onboarding', { method: 'POST' }),
}
