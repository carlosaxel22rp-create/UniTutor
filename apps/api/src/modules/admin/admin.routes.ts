import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { Errors } from '../../lib/errors.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { requireMfa, requireRole } from '../../middleware/require-role.js'
import { noStore } from '../../middleware/transport.js'
import { valid, validate } from '../../middleware/validate.js'
import { audit, notify } from '../shared.js'

const TsParams = z.strictObject({ tutorId: z.uuid(), subjectId: z.coerce.number().int().positive() })
const ReviewBody = z.discriminatedUnion('decision', [
  z.strictObject({ decision: z.literal('approve'), finalGrade: z.number().min(8).max(10).multipleOf(0.01) }),
  z.strictObject({ decision: z.literal('reject'), note: z.string().min(5).max(500) }),
])

/**
 * Rutas de administración: rol admin + MFA (aal2) + rate limit + auditoría.
 * Todo cambio de rol o aprobación queda en audit_logs (append-only).
 */
export function adminRoutes(limiter: RequestHandler) {
  const r = Router()
  r.use('/admin', requireRole('admin'), requireMfa, limiter, noStore)

  /** URL firmada (60 s) para revisar el kárdex en el bucket privado */
  r.get('/admin/tutor-subjects/:tutorId/:subjectId/evidence', validate('params', TsParams), async (req, res, next) => {
    try {
      const { tutorId, subjectId } = valid<z.infer<typeof TsParams>>(req, 'params')
      const { data: ts } = await supabaseAdmin
        .from('tutor_subjects')
        .select('evidence_path')
        .eq('tutor_id', tutorId)
        .eq('subject_id', subjectId)
        .maybeSingle<{ evidence_path: string | null }>()
      if (!ts?.evidence_path) throw Errors.notFound()
      const { data, error } = await supabaseAdmin.storage.from('tutor-evidence').createSignedUrl(ts.evidence_path, 60)
      if (error) throw error
      await audit({ actorId: req.auth!.id, action: 'evidence.viewed', entity: 'tutor_subjects', entityId: `${tutorId}:${subjectId}`, ip: req.ip })
      res.json({ url: data.signedUrl, expiresInSec: 60 })
    } catch (err) {
      next(err)
    }
  })

  /** Aprueba/rechaza una materia; si aprueba, promueve a rol tutor. */
  r.post(
    '/admin/tutor-subjects/:tutorId/:subjectId/review',
    validate('params', TsParams),
    validate('body', ReviewBody),
    async (req, res, next) => {
      try {
        const { tutorId, subjectId } = valid<z.infer<typeof TsParams>>(req, 'params')
        const body = valid<z.infer<typeof ReviewBody>>(req, 'body')
        const adminId = req.auth!.id
        if (adminId === tutorId) throw Errors.forbidden('No puedes aprobar tus propias materias') // segregación de funciones

        const patch =
          body.decision === 'approve'
            ? { status: 'approved', final_grade: body.finalGrade, verified_by: adminId, verified_at: new Date().toISOString(), rejection_note: null }
            : { status: 'rejected', rejection_note: body.note, verified_by: adminId, verified_at: new Date().toISOString() }

        const { data, error } = await supabaseAdmin
          .from('tutor_subjects')
          .update(patch)
          .eq('tutor_id', tutorId)
          .eq('subject_id', subjectId)
          .eq('status', 'pending')
          .select('tutor_id')
        if (error) throw error
        if (!data?.length) throw Errors.conflict('La solicitud no está pendiente')

        if (body.decision === 'approve') {
          await supabaseAdmin.from('users').update({ role: 'tutor' }).eq('id', tutorId).eq('role', 'student')
          await notify([{ userId: tutorId, type: 'tutor_approved', title: '¡Fuiste aprobado como tutor!', body: 'Configura tus pagos para aparecer en el catálogo.' }])
        }
        await audit({
          actorId: adminId,
          action: `tutor_subject.${body.decision}`,
          entity: 'tutor_subjects',
          entityId: `${tutorId}:${subjectId}`,
          details: body.decision === 'approve' ? { finalGrade: body.finalGrade } : { note: body.note },
          ip: req.ip,
        })
        res.json({ ok: true })
      } catch (err) {
        next(err)
      }
    },
  )

  return r
}
