'use client'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, type CheckoutResponse } from '@/lib/api'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { TutorCardData } from '../catalog/TutorCard'

// Stripe.js se carga desde js.stripe.com (requisito PCI): la tarjeta vive
// en un iframe de Stripe y nunca toca el DOM ni los servidores de EduConnect.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const DAYS = [1, 2, 3, 4, 5] as const // Lun–Vie como en el Figma
const DAY_LABEL: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie' }
const HOURS = [8, 9, 10, 11, 14, 15, 16, 17]
const TZ = 'America/Mexico_City'

interface Availability { weekday: number; start_time: string; end_time: string }

/** Próxima fecha (en CDMX) del día ISO `weekday` a la hora `hour`, como ISO con offset. */
function nextSlotIso(weekday: number, hour: number): string {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  const iso = ((local.getDay() + 6) % 7) + 1
  let add = (weekday - iso + 7) % 7
  if (add === 0 && local.getHours() + 2 >= hour) add = 7
  const d = new Date(local)
  d.setDate(local.getDate() + add)
  const pad = (n: number) => String(n).padStart(2, '0')
  // México no usa horario de verano desde 2022 → offset fijo −06:00
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00:00-06:00`
}

/** SchedulingWidget del Figma + pago. */
export function CheckoutPanel({ tutor, subjectId, onClose }: { tutor: TutorCardData; subjectId: number; onClose: () => void }) {
  const [availability, setAvailability] = useState<Availability[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Un Idempotency-Key por intento: si el usuario da doble clic o reintenta, no se cobra dos veces
  const idemKey = useRef(crypto.randomUUID())

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase
      .from('tutor_availability')
      .select('weekday, start_time, end_time')
      .eq('tutor_id', tutor.tutor_id)
      .then(({ data }) => setAvailability((data as Availability[]) ?? []))
    setSelected(new Set())
    setCheckout(null)
    idemKey.current = crypto.randomUUID()
  }, [tutor.tutor_id])

  const isAvailable = (day: number, hour: number) =>
    availability.some((a) => a.weekday === day && Number(a.start_time.slice(0, 2)) <= hour && Number(a.end_time.slice(0, 2)) >= hour + 1)

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else if (next.size < 10) next.add(key)
      return next
    })

  async function startCheckout() {
    setLoading(true)
    setError(null)
    try {
      const slots = [...selected].map((k) => {
        const [d, h] = k.split('-').map(Number)
        return nextSlotIso(d!, h!)
      })
      setCheckout(await api.checkout({ tutorId: tutor.tutor_id, subjectId, slots }, idemKey.current))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar el pago')
      if (e instanceof ApiError && e.code === 'slot_taken') idemKey.current = crypto.randomUUID()
    } finally {
      setLoading(false)
    }
  }

  const options = useMemo(
    () =>
      checkout
        ? {
            clientSecret: checkout.clientSecret,
            appearance: { theme: 'night' as const, variables: { colorPrimary: '#F97316', borderRadius: '12px' } },
            locale: 'es-419' as const,
          }
        : null,
    [checkout],
  )

  return (
    <section className="glass-strong rounded-2xl p-5">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg">Agenda con {tutor.display_name}</h3>
          <p className="text-xs text-white/50">Elige hasta 10 horarios (1 h c/u)</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="text-white/40 hover:text-white">✕</button>
      </header>

      {!checkout && (
        <>
          <div className="grid grid-cols-6 gap-1 text-xs" role="grid">
            <span />
            {DAYS.map((d) => <span key={d} className="text-center font-semibold text-white/60">{DAY_LABEL[d]}</span>)}
            {HOURS.map((h) => (
              <Row key={h} hour={h} isAvailable={isAvailable} selected={selected} toggle={toggle} />
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <button
            disabled={selected.size === 0 || loading}
            onClick={startCheckout}
            className="mt-4 w-full font-bold text-sm py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue-2 disabled:opacity-30"
          >
            {loading ? 'Reservando…' : selected.size ? `Pagar y agendar (${selected.size})` : 'Selecciona horarios'}
          </button>
        </>
      )}

      {checkout && options && (
        <Elements stripe={stripePromise} options={options}>
          <PayForm checkout={checkout} />
        </Elements>
      )}
    </section>
  )
}

function Row(props: { hour: number; isAvailable: (d: number, h: number) => boolean; selected: Set<string>; toggle: (k: string) => void }) {
  return (
    <>
      <span className="text-right pr-1 text-white/40">{props.hour}:00</span>
      {DAYS.map((d) => {
        const key = `${d}-${props.hour}`
        const available = props.isAvailable(d, props.hour)
        const on = props.selected.has(key)
        return (
          <button
            key={key}
            disabled={!available}
            onClick={() => props.toggle(key)}
            aria-pressed={on}
            aria-label={`${DAY_LABEL[d]} ${props.hour}:00`}
            className={`h-7 rounded-md ${on ? 'glass-slot-active text-orange-200 font-bold' : 'glass-slot'} disabled:opacity-20`}
          >
            {on ? '✓' : ''}
          </button>
        )
      })}
    </>
  )
}

function PayForm({ checkout }: { checkout: CheckoutResponse }) {
  const stripe = useStripe()
  const elements = useElements()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    // 3-D Secure / SCA lo gestiona Stripe. El resultado definitivo llega al
    // API por webhook firmado; esta redirección es solo UX.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/mis-sesiones?pago=${checkout.paymentId}` },
    })
    if (error) setMsg(error.message ?? 'Pago rechazado')
    setBusy(false)
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <p className="text-sm text-white/70">
        Total: <strong>{mxn.format(checkout.amountCents / 100)}</strong> · Horarios apartados hasta{' '}
        {new Date(checkout.holdExpiresAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <PaymentElement />
      {msg && <p role="alert" className="text-sm text-red-300">{msg}</p>}
      <button disabled={!stripe || busy} className="btn-primary w-full py-3 rounded-xl font-bold disabled:opacity-50">
        {busy ? 'Procesando…' : 'Pagar'}
      </button>
      <p className="text-[11px] text-white/40">Pago procesado por Stripe. EduConnect no almacena datos de tu tarjeta.</p>
    </form>
  )
}
