import type { NextConfig } from 'next'

/**
 * Cabeceras de seguridad estáticas (la CSP con nonce se genera por
 * petición en src/proxy.ts). Vercel sirve solo por HTTPS con TLS 1.2/1.3.
 */
const dailyOrigin = `https://${process.env.NEXT_PUBLIC_DAILY_DOMAIN ?? 'educonnect'}.daily.co`

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // popups de 3DS
  {
    key: 'Permissions-Policy',
    // Cámara/micrófono solo para el iframe del aula (Daily) y la propia app
    value: `camera=(self "${dailyOrigin}"), microphone=(self "${dailyOrigin}"), display-capture=(self "${dailyOrigin}"), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), interest-cohort=()`,
  },
]

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  images: {
    // Solo imágenes del bucket público de avatares en Supabase Storage (evita SSRF/abuso del optimizador)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co').hostname,
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
}

export default config
