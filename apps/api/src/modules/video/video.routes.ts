import express, { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { verifyDailySignature } from '../../lib/daily.js'
import { logger } from '../../lib/logger.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { requireRole } from '../../middleware/require-role.js'
import { noStore } from '../../middleware/transport.js'
import { valid, validate } from '../../middleware/validate.js'
import type { BookingRow } from '../shared.js'
import { closeSession, issueJoinToken } from './video.service.js'

const BookingParams = z.strictObject({ id: z.uuid() })

/** POST /v1/bookings/:id/video-token → { roomUrl, token, expiresAt } */
export function videoRoutes(limiter: RequestHandler) {
  const r = Router()
  r.post(
    '/bookings/:id/video-token',
    requireRole('student', 'tutor'),
    limiter,
    noStore,
    validate('params', BookingParams),
    async (req, res, next) => {
      try {
        const { id } = valid<{ id: string }>(req, 'params')
        res.json(await issueJoinToken(id, req.auth!.id))
      } catch (err) {
        next(err)
      }
    },
  )
  return r
}

const DailyEvent = z.object({
  id: z.string().optional(),
  type: z.string(),
  payload: z.object({ room: z.string().optional(), user_id: z.string().optional() }).loose().optional(),
})

/**
 * POST /webhooks/daily  (sin JWT; autenticado por firma HMAC)
 * Montado con express.raw() ANTES del parser JSON: la firma se calcula
 * sobre el cuerpo exacto recibido.
 */
export function dailyWebhookRouter() {
  const r = Router()
  r.post('/daily', express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
    const ok = verifyDailySignature({
      rawBody,
      timestamp: req.get('X-Webhook-Timestamp'),
      signature: req.get('X-Webhook-Signature'),
      secretB64: env.DAILY_WEBHOOK_HMAC,
    })
    if (!ok) {
      logger.warn({ ip: req.ip }, 'daily webhook: firma inválida')
      return res.status(401).end()
    }

    let parsed: z.infer<typeof DailyEvent>
    try {
      const json = JSON.parse(rawBody)
      if (json?.test === 'test') return res.status(200).end() // handshake al registrar el webhook
      parsed = DailyEvent.parse(json)
    } catch {
      return res.status(400).end()
    }

    try {
      const room = parsed.payload?.room
      if (!room || !/^ec-[0-9a-f-]{36}$/.test(room)) return res.status(200).end() // sala ajena: ignorar

      const { data: b } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('video_room_name', room)
        .maybeSingle<BookingRow>()
      if (!b) return res.status(200).end()

      if (parsed.type === 'participant.joined') {
        const uid = parsed.payload?.user_id
        const col = uid === b.tutor_id ? 'tutor_joined_at' : uid === b.student_id ? 'student_joined_at' : null
        if (col) {
          await supabaseAdmin.from('bookings').update({ [col]: new Date().toISOString() }).eq('id', b.id).is(col, null)
          await supabaseAdmin.from('bookings').update({ status: 'in_progress' }).eq('id', b.id).eq('status', 'confirmed')
        }
      } else if (parsed.type === 'meeting.ended') {
        const { data: fresh } = await supabaseAdmin.from('bookings').select('*').eq('id', b.id).single<BookingRow>()
        if (fresh) await closeSession(fresh)
      }
      res.status(200).end()
    } catch (err) {
      logger.error({ err }, 'daily webhook: error de procesamiento')
      res.status(500).end() // Daily reintenta
    }
  })
  return r
}
