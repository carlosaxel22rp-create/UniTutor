import { headers } from 'next/headers'
import Script from 'next/script'
import { RegistroForm } from './RegistroForm'

/**
 * Server Component: lee el nonce generado en src/proxy.ts y lo pasa al
 * script de Turnstile (CSP con 'strict-dynamic' solo ejecuta scripts con nonce).
 */
export default async function RegistroPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
      <RegistroForm />
    </>
  )
}
