import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

// next/font descarga las fuentes en build y las sirve desde el propio dominio
// → font-src 'self' en la CSP, sin peticiones a Google desde el navegador.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })

export const metadata: Metadata = {
  title: 'EduConnect · Tutorías entre compañeros UTOM',
  description: 'Encuentra a un compañero que ya aprobó la materia y agenda una sesión.',
  robots: { index: false, follow: false }, // plataforma privada de la comunidad
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  )
}
