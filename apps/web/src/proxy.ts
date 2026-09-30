import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy de Next.js 16 (antes "middleware"). Por cada petición de página:
 *  1. Genera un nonce y la Content-Security-Policy estricta.
 *  2. Refresca la sesión de Supabase (cookies HttpOnly, Secure, SameSite=Lax).
 *  3. Protege rutas privadas: sin sesión → /login.
 *
 * La autorización real (roles, ownership) la hacen RLS y el API; aquí
 * solo se evita renderizar páginas privadas a visitantes anónimos.
 */
const PROTECTED = ['/explorar', '/aula', '/mis-sesiones', '/tutor', '/admin', '/checkout']

function buildCsp(nonce: string) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseWs = supabase.replace('https://', 'wss://')
  const api = process.env.NEXT_PUBLIC_API_URL!
  const daily = `https://${process.env.NEXT_PUBLIC_DAILY_DOMAIN}.daily.co`
  const dev = process.env.NODE_ENV === 'development'

  return [
    `default-src 'self'`,
    // strict-dynamic: solo scripts con nonce y los que ellos carguen (Stripe.js, Turnstile)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data: ${supabase} https://*.stripe.com`,
    `font-src 'self'`, // next/font auto-hospeda Outfit e Inter
    `connect-src 'self' ${supabase} ${supabaseWs} ${api} https://api.stripe.com https://*.daily.co wss://*.daily.co`,
    `frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com ${daily}`,
    `media-src 'self' blob:`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: 'lax' }),
          )
        },
      },
    },
  )

  // getClaims() valida la firma del JWT (JWKS) — nunca confiar solo en getSession()
  const { data } = await supabase.auth.getClaims()
  const isLoggedIn = Boolean(data?.claims?.sub)

  const path = request.nextUrl.pathname
  if (!isLoggedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', path) // solo ruta relativa → sin open redirect
    const redirect = NextResponse.redirect(url)
    redirect.headers.set('Content-Security-Policy', csp)
    return redirect
  }

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
