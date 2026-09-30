import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente Supabase para Server Components / Server Actions.
 * Usa la clave PUBLICABLE (anon) + la sesión del usuario → la RLS aplica.
 * La service_role NUNCA se usa en el frontend.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: 'lax' }),
          )
        } catch {
          // Server Component de solo lectura: el proxy ya refrescó la sesión
        }
      },
    },
  })
}
