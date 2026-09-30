import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import { VideoRoom } from '@/components/video/VideoRoom'

/**
 * /aula/:bookingId — la RLS de bookings solo devuelve la fila si el
 * usuario es alumno o tutor de esa sesión (anti-IDOR). El token de video
 * se emite después, en el API, con las mismas verificaciones + ventana horaria.
 */
export default async function AulaPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await connection()
  const { bookingId } = await params
  if (!z.uuid().safeParse(bookingId).success) notFound()

  const supabase = await createSupabaseServer()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, start_at, end_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) notFound()

  const start = new Date(booking.start_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' })
  return (
    <main className="bg-app min-h-screen px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-1">Aula virtual</h1>
      <p className="text-sm text-white/50 mb-4">{start} · El aula abre 10 minutos antes</p>
      <VideoRoom bookingId={booking.id} />
    </main>
  )
}
