import { Router, type RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { requireRole } from '../../middleware/require-role.js'
import { noStore } from '../../middleware/transport.js'
import { audit } from '../shared.js'

/**
 * POST /v1/tutors/me/stripe/onboarding → { url }
 * Crea (una sola vez) la cuenta Connect Express del tutor y devuelve un
 * Account Link de un solo uso. Stripe hace el KYC y captura la CLABE:
 * EduConnect nunca ve datos bancarios ni identificaciones oficiales.
 */
export function tutorRoutes(limiter: RequestHandler) {
  const r = Router()

  r.post('/tutors/me/stripe/onboarding', requireRole('tutor'), limiter, noStore, async (req, res, next) => {
    try {
      const uid = req.auth!.id
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('stripe_account_id')
        .eq('id', uid)
        .single<{ stripe_account_id: string | null }>()

      let accountId = u?.stripe_account_id ?? null
      if (!accountId) {
        const account = await stripe.accounts.create(
          {
            type: 'express',
            country: 'MX',
            email: req.auth!.email,
            business_type: 'individual',
            capabilities: { transfers: { requested: true } },
            business_profile: { product_description: 'Tutorías académicas entre pares (EduConnect)' },
            metadata: { user_id: uid },
          },
          { idempotencyKey: `acct-${uid}` },
        )
        accountId = account.id
        await supabaseAdmin.from('users').update({ stripe_account_id: accountId }).eq('id', uid).is('stripe_account_id', null)
        await audit({ actorId: uid, action: 'stripe.account_created', entity: 'users', entityId: uid, ip: req.ip })
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        refresh_url: `${env.APP_URL}/tutor/pagos?refresh=1`,
        return_url: `${env.APP_URL}/tutor/pagos?listo=1`,
      })
      res.json({ url: link.url })
    } catch (err) {
      next(err)
    }
  })

  return r
}
