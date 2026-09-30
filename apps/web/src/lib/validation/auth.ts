import { z } from 'zod'

/**
 * Validación de registro compartida (cliente y Server Action).
 * La validación del cliente es solo UX: la autoridad es el trigger en
 * auth.users (BD) + la revalidación del Server Action.
 */
export const INSTITUTIONAL_DOMAIN = 'utom.edu.mx'
const INSTITUTIONAL_RE = /^[a-z0-9._%+-]+@utom\.edu\.mx$/

export const SignUpSchema = z.object({
  fullName: z.string().trim().min(3, 'Escribe tu nombre completo').max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .regex(INSTITUTIONAL_RE, `Usa tu correo institucional @${INSTITUTIONAL_DOMAIN}`),
  password: z
    .string()
    .min(12, 'Mínimo 12 caracteres')
    .max(72, 'Máximo 72 caracteres') // límite de bcrypt
    .regex(/[a-z]/, 'Incluye una minúscula')
    .regex(/[A-Z]/, 'Incluye una mayúscula')
    .regex(/\d/, 'Incluye un número')
    .regex(/[^A-Za-z0-9]/, 'Incluye un símbolo'),
  acceptTerms: z.literal('on', { message: 'Debes aceptar el aviso de privacidad y los términos' }),
  captchaToken: z.string().min(10, 'Completa la verificación anti-bots'),
})
export type SignUpInput = z.infer<typeof SignUpSchema>
