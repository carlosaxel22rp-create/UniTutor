'use server'
import { headers } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase/server'
import { SignUpSchema } from '@/lib/validation/auth'

export interface SignUpState {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Server Action de registro.
 *  - Next.js valida el header Origin en Server Actions (anti-CSRF).
 *  - Revalida con zod (dominio institucional, política de contraseña).
 *  - El token de Turnstile se pasa a Supabase Auth, que lo verifica
 *    (Bot & Abuse Protection) y aplica sus propios rate limits.
 *  - Mensaje genérico: no revela si el correo ya existe (anti enumeración).
 *  - Supabase guarda la contraseña con bcrypt; nunca pasa por nuestra BD.
 */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    acceptTerms: formData.get('acceptTerms'),
    captchaToken: formData.get('cf-turnstile-response'),
  })
  if (!parsed.success) {
    return { ok: false, message: 'Revisa los campos marcados', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const origin = (await headers()).get('origin')
  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      captchaToken: parsed.data.captchaToken,
      data: { full_name: parsed.data.fullName }, // el rol NO se envía: la BD lo fija en 'student'
      emailRedirectTo: `${origin ?? process.env.NEXT_PUBLIC_APP_URL}/auth/confirmar`,
    },
  })

  if (error && error.status === 429) {
    return { ok: false, message: 'Demasiados intentos. Espera unos minutos.' }
  }
  if (error && error.code === 'weak_password') {
    return { ok: false, message: 'Esa contraseña aparece en filtraciones conocidas. Elige otra.' }
  }
  // Cualquier otro caso (incl. correo ya registrado) → misma respuesta
  return { ok: true, message: 'Si el correo es válido, recibirás un enlace para confirmar tu cuenta.' }
}
