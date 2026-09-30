'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'

interface Notification { id: number; title: string; body: string | null; created_at: string; read_at: string | null }

/**
 * Campana del nav del Figma. Supabase Realtime respeta la RLS:
 * aunque alguien modifique el filtro en el navegador, solo recibe sus filas.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase
      .from('notifications')
      .select('id, title, body, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setItems((data as Notification[]) ?? []))

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) =>
        setItems((prev) => [payload.new as Notification, ...prev].slice(0, 10)),
      )
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [userId])

  const unread = items.filter((n) => !n.read_at).length

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    await createSupabaseBrowser().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) void markAllRead() }}
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ''}`}
        className="relative w-9 h-9 rounded-xl grid place-items-center text-white/60 hover:bg-white/10"
      >
        🔔
        {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 glass-strong rounded-2xl p-3 z-50">
          {items.length === 0 && <p className="text-xs text-white/50">Sin notificaciones</p>}
          {items.map((n) => (
            <div key={n.id} className="p-2 rounded-xl hover:bg-white/10">
              <p className="text-xs text-white/80">{n.title}</p>
              {n.body && <p className="text-xs text-white/50">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
