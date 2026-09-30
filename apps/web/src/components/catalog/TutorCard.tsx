import Image from 'next/image'

/** Fila de la vista public.tutor_cards (RLS aplicada). */
export interface TutorCardData {
  tutor_id: string
  display_name: string
  avatar_path: string | null
  career: string | null
  semester: number | null
  rating_avg: number
  rating_count: number
  hourly_rate_cents: number
  badge: 'passed_with_excellence' | 'honor_roll' | null
  subjects: string[]
}

const BADGE_LABEL = { passed_with_excellence: 'Aprobó con excelencia', honor_roll: 'Cuadro de honor' } as const
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export function avatarUrl(path: string | null) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null
}

/**
 * TutorCard del Figma. Todo el texto proviene de la BD y React lo escapa
 * (sin dangerouslySetInnerHTML en ningún lugar del proyecto).
 */
export function TutorCard({ tutor, onBook }: { tutor: TutorCardData; onBook: (t: TutorCardData) => void }) {
  const src = avatarUrl(tutor.avatar_path)
  return (
    <article className="glass rounded-2xl overflow-hidden transition hover:-translate-y-0.5 hover:bg-white/15">
      <div className="relative h-44">
        {src ? (
          <Image src={src} alt={`Foto de ${tutor.display_name}`} fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover object-top" />
        ) : (
          <div className="h-full bg-gradient-to-br from-blue-500/30 to-indigo-700/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {tutor.badge && (
          <span className="absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
            ★ {BADGE_LABEL[tutor.badge]}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-display font-semibold text-white">{tutor.display_name}</h3>
            <p className="text-xs text-white/50">
              {tutor.career} {tutor.semester ? `· ${tutor.semester}.º semestre` : ''}
            </p>
          </div>
          <p className="font-bold text-orange-300">
            {mxn.format(tutor.hourly_rate_cents / 100)}
            <span className="text-xs font-normal text-white/40">/h</span>
          </p>
        </div>
        <p className="text-xs text-white/60 mb-3">
          <span className="text-orange-400">★</span> {Number(tutor.rating_avg).toFixed(1)} ({tutor.rating_count})
        </p>
        <ul className="flex flex-wrap gap-1 mb-3">
          {tutor.subjects.map((s) => (
            <li key={s} className="text-xs bg-white/10 text-white/70 border border-white/10 px-2 py-0.5 rounded-full">{s}</li>
          ))}
        </ul>
        <button onClick={() => onBook(tutor)} className="btn-primary w-full text-sm font-semibold py-2 rounded-xl">
          Reservar sesión
        </button>
      </div>
    </article>
  )
}
