import { connection } from 'next/server'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { TutorCardData } from '@/components/catalog/TutorCard'
import { TutorGrid } from '@/components/catalog/TutorGrid'

const Search = z.object({
  materia: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(80).optional(),
})

/**
 * "Browse by Career → Subject → Tutores" del Figma.
 * Server Component: consulta Supabase con la sesión del usuario (RLS).
 * Parámetros de búsqueda validados; el filtro de texto usa el cliente
 * parametrizado (sin concatenar SQL).
 */
export default async function ExplorarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection() // render dinámico → nonce CSP
  const params = Search.safeParse(await searchParams)
  const { materia, q } = params.success ? params.data : {}

  const supabase = await createSupabaseServer()

  let query = supabase
    .from('tutor_cards')
    .select('tutor_id, display_name, avatar_path, career, semester, rating_avg, rating_count, hourly_rate_cents, badge, subjects')
    .order('rating_avg', { ascending: false })
    .limit(30)
  if (materia) query = query.contains('subject_ids', [materia])
  if (q) query = query.ilike('display_name', `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)

  const [{ data: tutors }, { data: careers }] = await Promise.all([
    query.returns<TutorCardData[]>(),
    supabase.from('careers').select('id, slug, name').order('name'),
  ])

  return (
    <main className="bg-app min-h-screen px-4 sm:px-6 py-10 max-w-7xl mx-auto">
      <h1 className="font-display text-3xl font-bold mb-6">Encuentra a un compañero que te ayude a estudiar</h1>
      <nav aria-label="Carreras" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {careers?.map((c) => (
          <a key={c.id} href={`/explorar/${c.slug}`} className="glass rounded-2xl p-4 hover:bg-white/15">
            <span className="text-sm font-semibold">{c.name}</span>
          </a>
        ))}
      </nav>
      <TutorGrid tutors={tutors ?? []} subjectId={materia ?? null} />
    </main>
  )
}
