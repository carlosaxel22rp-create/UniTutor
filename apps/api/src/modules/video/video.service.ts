import { Errors } from '../../lib/errors.js'
import { createMeetingToken, createPrivateRoom, deleteRoom, roomUrl } from '../../lib/daily.js'
import { logger } from '../../lib/logger.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { notify, toEpoch, type BookingRow } from '../shared.js'

export const JOIN_EARLY_SEC = 10 * 60 // el aula abre 10 min antes
export const ROOM_GRACE_SEC = 15 * 60 // y se destruye 15 min después del fin

export const roomNameFor = (bookingId: string) => `ec-${bookingId}`

/** Crea la sala privada de una reserva confirmada (idempotente). */
export async function provisionRoom(b: Pick<BookingRow, 'id' | 'start_at' | 'end_at'>) {
  const name = roomNameFor(b.id)
  await createPrivateRoom({
    name,
    nbf: toEpoch(b.start_at) - JOIN_EARLY_SEC,
    exp: toEpoch(b.end_at) + ROOM_GRACE_SEC,
  })
  await supabaseAdmin.from('bookings').update({ video_room_name: name }).eq('id', b.id).is('video_room_name', null)
  return name
}

/**
 * Emite un token de acceso EFÍMERO para entrar al aula.
 * Controles:
 *  - Solo alumno o tutor de ESA reserva (anti-IDOR; admin no entra a clases).
 *  - Solo en estado confirmed / in_progress.
 *  - Solo dentro de la ventana [inicio − 10 min, fin].
 *  - exp = fin + 5 min y eject_at_token_exp → expulsión automática.
 *  - El token no se persiste; la respuesta lleva Cache-Control: no-store.
 */
export async function issueJoinToken(bookingId: string, userId: string, nowMs = Date.now()) {
  const { data: b, error } = await supabaseAdmin
    .from('bookings')
    .select('id, student_id, tutor_id, status, start_at, end_at, video_room_name')
    .eq('id', bookingId)
    .maybeSingle<BookingRow>()
  if (error) throw error

  // Misma respuesta si no existe o no es participante → no revela existencia
  if (!b || (b.student_id !== userId && b.tutor_id !== userId)) throw Errors.notFound('Sesión no encontrada')
  if (b.status !== 'confirmed' && b.status !== 'in_progress') throw Errors.conflict('La sesión no está activa', 'session_inactive')

  const now = Math.floor(nowMs / 1000)
  const start = toEpoch(b.start_at)
  const end = toEpoch(b.end_at)
  if (now < start - JOIN_EARLY_SEC) throw Errors.conflict('El aula abre 10 minutos antes de la sesión', 'too_early')
  if (now > end) throw Errors.conflict('La sesión ya terminó', 'session_over')

  const roomName = b.video_room_name ?? (await provisionRoom(b))

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single<{ display_name: string }>()

  const exp = end + 5 * 60
  const token = await createMeetingToken({
    roomName,
    userId,
    userName: profile?.display_name ?? 'Participante',
    isOwner: b.tutor_id === userId,
    nbf: start - JOIN_EARLY_SEC,
    exp,
  })
  return { roomUrl: roomUrl(roomName), token, expiresAt: new Date(exp * 1000).toISOString() }
}

/**
 * Cierre de sesión (webhook meeting.ended o job de mantenimiento):
 *  - ambos entraron / solo faltó el alumno → completed (el tutor cobra)
 *  - faltó el tutor → disputed (el admin reembolsa)
 */
export async function closeSession(b: BookingRow) {
  if (b.status !== 'confirmed' && b.status !== 'in_progress') return

  const tutorShowed = Boolean(b.tutor_joined_at)
  const next = tutorShowed ? 'completed' : 'disputed'
  const { data } = await supabaseAdmin
    .from('bookings')
    .update({ status: next, cancellation_reason: tutorShowed ? null : 'No-show del tutor (automático)' })
    .eq('id', b.id)
    .in('status', ['confirmed', 'in_progress'])
    .select('id')
  if (!data?.length) return // otro proceso ya la cerró

  if (b.video_room_name) await deleteRoom(b.video_room_name).catch((err) => logger.warn({ err }, 'deleteRoom failed'))

  await notify(
    next === 'completed'
      ? [{ userId: b.student_id, type: 'system', title: '¿Cómo estuvo tu sesión?', body: 'Deja una reseña para tu tutor.', bookingId: b.id }]
      : [
          { userId: b.student_id, type: 'system', title: 'Tu tutor no se conectó', body: 'Revisaremos el caso y te reembolsaremos.', bookingId: b.id },
          { userId: b.tutor_id, type: 'system', title: 'Sesión marcada como no-show', body: 'Contacta a soporte si fue un error.', bookingId: b.id },
        ],
  )
}
