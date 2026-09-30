'use client'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'

/**
 * Aula virtual. El token se pide al API justo antes de entrar:
 *  - efímero (expira al terminar la sesión + 5 min, con expulsión automática)
 *  - no se guarda en localStorage ni en la URL
 *  - la sala es privada: sin token no se puede entrar
 */
export function VideoRoom({ bookingId }: { bookingId: string }) {
  const container = useRef<HTMLDivElement>(null)
  const callRef = useRef<DailyCall | null>(null)
  const [status, setStatus] = useState<'idle' | 'joining' | 'in' | 'left' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function join() {
    if (!container.current || callRef.current) return
    setStatus('joining')
    try {
      const { roomUrl, token } = await api.videoToken(bookingId)
      const call = DailyIframe.createFrame(container.current, {
        showLeaveButton: true,
        iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '16px' },
        lang: 'es',
      })
      callRef.current = call
      call.on('left-meeting', () => setStatus('left'))
      call.on('error', () => setStatus('error'))
      await call.join({ url: roomUrl, token })
      setStatus('in')
    } catch (e) {
      setStatus('error')
      setError(e instanceof ApiError ? e.message : 'No fue posible entrar al aula')
    }
  }

  useEffect(() => () => void callRef.current?.destroy(), [])

  return (
    <section className="glass-strong rounded-2xl p-4 h-[75vh] flex flex-col">
      {status !== 'in' && (
        <div className="m-auto text-center space-y-3">
          {status === 'left' ? <p>Saliste de la sesión. ¡No olvides dejar tu reseña!</p> : null}
          {error ? <p role="alert" className="text-red-300 text-sm">{error}</p> : null}
          {(status === 'idle' || status === 'error') && (
            <button onClick={join} className="btn-primary px-6 py-3 rounded-xl font-semibold">Entrar al aula</button>
          )}
          {status === 'joining' && <p className="text-white/60">Conectando…</p>}
        </div>
      )}
      <div ref={container} className={status === 'in' ? 'flex-1' : 'hidden'} />
    </section>
  )
}
