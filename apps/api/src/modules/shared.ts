import { logger } from '../lib/logger.js'
import { supabaseAdmin } from '../lib/supabase.js'

export interface BookingRow {
  id: string
  student_id: string
  tutor_id: string
  payment_id: string | null
  status:
    | 'pending_payment' | 'expired' | 'confirmed' | 'in_progress' | 'completed'
    | 'disputed' | 'cancelled' | 'refunded' | 'payout_released'
  start_at: string
  end_at: string
  price_cents: number
  platform_fee_cents: number
  tutor_payout_cents: number
  video_room_name: string | null
  student_joined_at: string | null
  tutor_joined_at: string | null
  late_cancellation: boolean
}

type NotificationType =
  | 'booking_confirmed' | 'booking_cancelled' | 'session_reminder'
  | 'review_published' | 'tutor_approved' | 'payout_released' | 'system'

/** Inserta notificaciones (campana del Figma). Realtime las entrega por RLS. */
export async function notify(
  items: { userId: string; type: NotificationType; title: string; body?: string; bookingId?: string }[],
) {
  if (items.length === 0) return
  const { error } = await supabaseAdmin.from('notifications').insert(
    items.map((n) => ({ user_id: n.userId, type: n.type, title: n.title, body: n.body ?? null, booking_id: n.bookingId ?? null })),
  )
  // Una notificación fallida no debe revertir un pago confirmado
  if (error) logger.warn({ err: error }, 'notify failed')
}

/** Bitácora append-only (A09). */
export async function audit(entry: { actorId: string | null; action: string; entity: string; entityId?: string; details?: object; ip?: string }) {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    details: entry.details ?? {},
    ip: entry.ip ?? null,
  })
  if (error) logger.error({ err: error, action: entry.action }, 'audit log failed')
}

export const toEpoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
