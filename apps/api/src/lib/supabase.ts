import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

/**
 * Cliente con SERVICE ROLE: omite RLS. Solo existe en el servidor.
 * Toda consulta que lo use DEBE filtrar explícitamente por el usuario
 * autenticado (ownership) — la RLS no nos protege aquí.
 *
 * Tipos: generar con `supabase gen types typescript --linked > src/types/database.ts`
 * y pasar el genérico a createClient<Database>().
 */
export const supabaseAdmin: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  db: { schema: 'public' },
  global: { headers: { 'x-application-name': 'educonnect-api' } },
})
