'use client'
import { createBrowserClient } from '@supabase/ssr'

/** Cliente de navegador (Realtime, lecturas con RLS). Solo clave publicable. */
export function createSupabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
}
