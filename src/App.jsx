import { useCallback, useState } from 'react'

// ── Datos de ejemplo (en apps/web vienen de Supabase: vista tutor_cards) ─────

const TUTORS = [
  {
    id: 1,
    name: 'Camila R.',
    career: 'Biotecnología',
    semester: 7,
    rating: 4.9,
    reviews: 38,
    rate: 220,
    badge: 'passed_with_excellence',
    photo: 'https://images.unsplash.com/photo-1770235622059-f544451fbe94?w=200&h=200&fit=crop&auto=format',
    subjects: ['Biología Celular', 'Genética'],
  },
  {
    id: 2,
    name: 'Mateo V.',
    career: 'Tecnologías de la Información',
    semester: 5,
    rating: 4.8,
    reviews: 54,
    rate: 180,
    badge: 'passed_with_excellence',
    photo: 'https://images.unsplash.com/photo-1613683746628-a54a60277611?w=200&h=200&fit=crop&auto=format',
    subjects: ['Algoritmos', 'Estructuras de Datos'],
  },
  {
    id: 3,
    name: 'Daniela F.',
    career: 'Mercadotecnia',
    semester: 6,
    rating: 4.7,
    reviews: 29,
    rate: 160,
    badge: 'passed_with_excellence',
    photo: 'https://images.unsplash.com/photo-1697593177788-003f08a1a3a6?w=200&h=200&fit=crop&auto=format',
    subjects: ['Estrategia de Marca', 'Comportamiento del Consumidor'],
  },
  {
    id: 4,
    name: 'Andrés M.',
    career: 'Gastronomía',
    semester: 4,
    rating: 4.6,
    reviews: 17,
    rate: 150,
    badge: 'honor_roll',
    photo: 'https://images.unsplash.com/photo-1544168190-79c17527004f?w=200&h=200&fit=crop&auto=format',
    subjects: ['Ciencia de los Alimentos', 'Repostería'],
  },
  {
    id: 5,
    name: 'Sofía L.',
    career: 'Tecnologías de la Información',
    semester: 8,
    rating: 5.0,
    reviews: 61,
    rate: 250,
    badge: 'passed_with_excellence',
    photo: 'https://images.unsplash.com/photo-1725473824966-b21a2ff3fda4?w=200&h=200&fit=crop&auto=format',
    subjects: ['Aprendizaje Automático', 'Python'],
  },
  {
    id: 6,
    name: 'Ricardo P.',
    career: 'Biotecnología',
    semester: 9,
    rating: 4.9,
    reviews: 44,
    rate: 240,
    badge: 'passed_with_excellence',
    photo: 'https://images.unsplash.com/photo-1617073201318-06ce39e6a224?w=200&h=200&fit=crop&auto=format',
    subjects: ['Biología Molecular', 'Bioquímica'],
  },
]

const CAREERS = [
  {
    id: 'ti',
    label: 'Tecnologías de la Información',
    count: 142,
    gradient: 'from-blue-500/30 to-indigo-600/20',
    accent: 'text-blue-300',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="22" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <path d="M9 24h10M14 19v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 10l3 3-3 3M16 13h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'gastronomia',
    label: 'Gastronomía',
    count: 68,
    gradient: 'from-orange-500/30 to-amber-600/20',
    accent: 'text-orange-300',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M8 4v8a4 4 0 008 0V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 4v20M20 4c0 5-3 8-3 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'biotecnologia',
    label: 'Biotecnología',
    count: 95,
    gradient: 'from-emerald-500/30 to-teal-600/20',
    accent: 'text-emerald-300',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <path d="M14 4v4M14 20v4M4 14h4M20 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.1 7.1l2.8 2.8M18.1 18.1l2.8 2.8M7.1 20.9l2.8-2.8M18.1 9.9l2.8-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'mercadotecnia',
    label: 'Mercadotecnia',
    count: 113,
    gradient: 'from-purple-500/30 to-violet-600/20',
    accent: 'text-purple-300',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 20L10 14l4 4 4-5 6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <path d="M22 9.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

// Materias por carrera; `related` = materias de los tutores que la cubren
const SUBJECTS = {
  ti: [
    { id: 'algoritmos', label: 'Algoritmos', tutorCount: 28, icon: '🧮', related: ['Algoritmos', 'Estructuras de Datos'] },
    { id: 'estructuras-datos', label: 'Estructuras de Datos', tutorCount: 24, icon: '🗂️', related: ['Estructuras de Datos', 'Algoritmos'] },
    { id: 'aprendizaje-automatico', label: 'Aprendizaje Automático', tutorCount: 19, icon: '🤖', related: ['Aprendizaje Automático', 'Python'] },
    { id: 'python', label: 'Python', tutorCount: 35, icon: '🐍', related: ['Python', 'Aprendizaje Automático'] },
    { id: 'desarrollo-web', label: 'Desarrollo Web', tutorCount: 41, icon: '🌐', related: ['Python', 'Estructuras de Datos'] },
    { id: 'bases-datos', label: 'Bases de Datos', tutorCount: 22, icon: '🗄️', related: ['Algoritmos', 'Estructuras de Datos'] },
  ],
  gastronomia: [
    { id: 'ciencia-alimentos', label: 'Ciencia de los Alimentos', tutorCount: 14, icon: '🔬', related: ['Ciencia de los Alimentos', 'Repostería'] },
    { id: 'reposteria', label: 'Repostería', tutorCount: 18, icon: '🥐', related: ['Repostería', 'Ciencia de los Alimentos'] },
    { id: 'tecnicas-culinarias', label: 'Técnicas Culinarias', tutorCount: 21, icon: '👨‍🍳', related: ['Ciencia de los Alimentos', 'Repostería'] },
    { id: 'nutricion', label: 'Nutrición', tutorCount: 15, icon: '🥗', related: ['Ciencia de los Alimentos'] },
  ],
  biotecnologia: [
    { id: 'biologia-celular', label: 'Biología Celular', tutorCount: 22, icon: '🦠', related: ['Biología Celular', 'Genética'] },
    { id: 'genetica', label: 'Genética', tutorCount: 19, icon: '🧬', related: ['Genética', 'Biología Celular'] },
    { id: 'biologia-molecular', label: 'Biología Molecular', tutorCount: 17, icon: '⚗️', related: ['Biología Molecular', 'Bioquímica'] },
    { id: 'bioquimica', label: 'Bioquímica', tutorCount: 20, icon: '🧪', related: ['Bioquímica', 'Biología Molecular'] },
  ],
  mercadotecnia: [
    { id: 'estrategia-marca', label: 'Estrategia de Marca', tutorCount: 26, icon: '💡', related: ['Estrategia de Marca', 'Comportamiento del Consumidor'] },
    { id: 'comportamiento-consumidor', label: 'Comportamiento del Consumidor', tutorCount: 23, icon: '📊', related: ['Comportamiento del Consumidor', 'Estrategia de Marca'] },
    { id: 'mercadotecnia-digital', label: 'Mercadotecnia Digital', tutorCount: 31, icon: '📱', related: ['Estrategia de Marca', 'Comportamiento del Consumidor'] },
    { id: 'investigacion-mercados', label: 'Investigación de Mercados', tutorCount: 18, icon: '🔍', related: ['Comportamiento del Consumidor', 'Estrategia de Marca'] },
  ],
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
const TIMES = ['8:00', '9:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

const REVIEWS = [
  { name: 'Laura G.', text: '¡Camila me explicó CRISPR clarísimo! Saqué 9.2 en el examen.', rating: 5 },
  { name: 'Pablo S.', text: 'Mateo es muy paciente. El mejor tutor para problemas de algoritmos.', rating: 5 },
  { name: 'Isabella T.', text: 'Sofía me ayudó a sacar adelante mi proyecto de ML. Valió cada peso.', rating: 5 },
]

const NOTIFICATIONS = [
  { text: 'Camila confirmó tu sesión del martes a las 10:00', time: 'hace 2 min' },
  { text: 'Nuevo tutor disponible en Biotecnología', time: 'hace 1 h' },
  { text: 'Se publicó tu reseña para Mateo', time: 'hace 3 h' },
]

const BADGE_LABEL = { passed_with_excellence: 'Aprobó con excelencia', honor_roll: 'Cuadro de honor' }
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// ── Subcomponentes ───────────────────────────────────────────────────────────

function Logo({ size = 'md' }) {
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg shadow-lg shadow-blue-900/40'
  const icon = size === 'sm' ? 12 : 18
  return (
    <div className={`${box} bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center`}>
      <svg width={icon} height={icon} viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 2L3 5.5V9c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5.5L9 2z" fill="white" fillOpacity="0.95" />
        {size !== 'sm' && <path d="M6 9l2 2 4-4" stroke="#3b4fd8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
  )
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Calificación ${rating.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" fill={i <= Math.round(rating) ? '#F97316' : 'rgba(255,255,255,0.2)'}>
          <path d="M7 1l1.55 3.14L12 4.74l-2.5 2.43.59 3.44L7 9.02 4.91 10.61l.59-3.44L3 4.74l3.45-.6L7 1z" />
        </svg>
      ))}
      <span className="text-xs text-white/60 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

function Badge({ type }) {
  const isExcellence = type === 'passed_with_excellence'
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
        isExcellence ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'bg-sky-400/20 text-sky-200 border border-sky-400/30'
      }`}
    >
      {isExcellence && (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
          <path d="M5 0l1.12 3.45H9.5L6.69 5.59l1.07 3.29L5 6.9 2.24 8.88l1.07-3.29L.5 3.45H3.88L5 0z" />
        </svg>
      )}
      {BADGE_LABEL[type]}
    </span>
  )
}

function TutorCard({ tutor, onBook }) {
  return (
    <article className="glass rounded-2xl overflow-hidden hover:bg-white/[0.14] transition-all duration-200 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-0.5">
      <div className="relative">
        <img src={tutor.photo} alt={`Foto de ${tutor.name}`} className="w-full h-44 object-cover object-top brightness-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2">
          <Badge type={tutor.badge} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-semibold text-white text-base">{tutor.name}</h3>
            <p className="text-xs text-white/50 mt-0.5">
              {tutor.career} · {tutor.semester}.º semestre
            </p>
          </div>
          <p className="text-base font-bold text-orange-300 text-right">
            {mxn.format(tutor.rate)}
            <span className="text-xs font-normal text-white/40">/h</span>
          </p>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={tutor.rating} />
          <span className="text-xs text-white/40">({tutor.reviews})</span>
        </div>
        <ul className="flex flex-wrap gap-1 mb-3">
          {tutor.subjects.map((s) => (
            <li key={s} className="text-xs bg-white/10 text-white/70 border border-white/10 px-2 py-0.5 rounded-full">
              {s}
            </li>
          ))}
        </ul>
        <button onClick={() => onBook(tutor.name)} className="btn-primary w-full font-semibold text-sm py-2 rounded-xl">
          Reservar sesión
        </button>
      </div>
    </article>
  )
}

function SchedulingWidget({ bookedTutor, onClose }) {
  const [selected, setSelected] = useState(() => new Set())

  const toggle = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const count = selected.size

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg">{bookedTutor ? `Agenda con ${bookedTutor}` : 'Tu horario semanal'}</h3>
          <p className="text-xs text-white/50 mt-0.5">Haz clic en los horarios para seleccionarlos</p>
        </div>
        {bookedTutor && (
          <button onClick={onClose} aria-label="Cerrar" className="text-white/40 hover:text-white/80 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        )}
      </div>

      {/* Calendario */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          <div className="grid grid-cols-6 gap-1 mb-1">
            <div className="py-1" />
            {DAYS.map((d) => (
              <div key={d} className="text-xs font-semibold text-white/60 text-center py-1">
                {d}
              </div>
            ))}
          </div>
          {TIMES.map((time) => (
            <div key={time} className="grid grid-cols-6 gap-1 mb-1">
              <div className="text-xs text-white/40 text-right pr-1 py-1.5 leading-none">{time}</div>
              {DAYS.map((day) => {
                const key = `${day}-${time}`
                const isSelected = selected.has(key)
                return (
                  <button
                    key={day}
                    onClick={() => toggle(key)}
                    aria-pressed={isSelected}
                    aria-label={`${day} ${time}`}
                    className={`h-7 rounded-md text-xs ${isSelected ? 'glass-slot-active text-orange-200 font-bold' : 'glass-slot text-white/30'}`}
                  >
                    {isSelected ? '✓' : ''}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/40 mt-3 mb-4">
        {count > 0 ? `${plural(count, 'horario')} seleccionado${count === 1 ? '' : 's'}` : 'Aún no seleccionas horarios'}
      </p>

      {/* Reseñas */}
      <div className="border-t border-white/10 pt-4 mb-4">
        <h4 className="text-sm font-semibold text-white/80 mb-3">Reseñas de alumnos</h4>
        <div className="space-y-2">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-xs flex items-center justify-center font-semibold">
                  {r.name[0]}
                </div>
                <span className="text-xs font-semibold text-white/80">{r.name}</span>
                <div className="flex ml-auto gap-0.5">
                  {Array.from({ length: r.rating }, (_, i) => (
                    <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="#F97316" aria-hidden="true">
                      <path d="M5 0l.8 2.45H8.5L6.35 3.91l.77 2.34L5 4.93 2.88 6.25l.77-2.34L1.5 2.45H4.2L5 0z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        disabled={count === 0}
        className={`w-full font-bold text-sm py-3 rounded-xl transition-all duration-150 ${
          count > 0
            ? 'bg-gradient-to-r from-brand-blue to-brand-blue-2 hover:from-brand-blue-2 hover:to-brand-blue-3 text-white shadow-lg shadow-blue-900/40'
            : 'bg-white/5 text-white/25 cursor-not-allowed border border-white/10'
        }`}
      >
        {count > 0 ? `Pagar y agendar (${plural(count, 'horario')})` : 'Selecciona horarios para continuar'}
      </button>
    </div>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all relative"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M9 2a5 5 0 00-5 5v3l-1.5 2h13L14 10V7a5 5 0 00-5-5z" strokeLinejoin="round" />
          <path d="M7 14a2 2 0 004 0" strokeLinecap="round" />
        </svg>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full border border-white/20 shadow-lg shadow-orange-500/50" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 glass-strong rounded-2xl shadow-2xl shadow-black/40 z-50 p-3">
          <p className="text-xs font-semibold text-white/80 mb-2 px-1">Notificaciones</p>
          {NOTIFICATIONS.map((n) => (
            <div key={n.text} className="flex gap-3 p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-orange shrink-0 shadow-sm shadow-orange-400/60" />
              <div>
                <p className="text-xs text-white/70 leading-relaxed">{n.text}</p>
                <p className="text-xs text-white/30 mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ size, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="8" r="5" />
      <path d="M14 14l2.5 2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── App principal ────────────────────────────────────────────────────────────

export default function App() {
  const [navSearch, setNavSearch] = useState('')
  const [heroSearch, setHeroSearch] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [activeCareer, setActiveCareer] = useState(null)
  const [activeSubject, setActiveSubject] = useState(null)
  const [bookedTutor, setBookedTutor] = useState(null)

  const runSearch = (q) => {
    setFilterQuery(q.trim())
    setActiveSubject(null)
  }

  const handleBook = (name) => {
    setBookedTutor(name)
    document.getElementById('schedule-widget')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCareerClick = (id) => {
    setActiveCareer(activeCareer === id ? null : id)
    setActiveSubject(null)
  }

  const clearAll = () => {
    setActiveCareer(null)
    setActiveSubject(null)
    setFilterQuery('')
    setHeroSearch('')
    setNavSearch('')
  }

  const currentSubjects = activeCareer ? SUBJECTS[activeCareer] ?? [] : []
  const activeCareerData = CAREERS.find((c) => c.id === activeCareer)
  const activeSubjectData = currentSubjects.find((s) => s.id === activeSubject)

  const filteredTutors = TUTORS.filter((t) => {
    if (activeSubjectData) return t.subjects.some((s) => activeSubjectData.related.includes(s))
    const q = filterQuery.toLowerCase()
    return (
      !!q &&
      (t.name.toLowerCase().includes(q) || t.career.toLowerCase().includes(q) || t.subjects.some((s) => s.toLowerCase().includes(q)))
    )
  }).sort((a, b) => b.rating - a.rating)

  // Los tutores solo aparecen tras elegir una materia o hacer una búsqueda
  const showTutors = !!activeSubject || !!filterQuery

  return (
    <div className="bg-app min-h-screen relative overflow-x-hidden">
      {/* Orbes de fondo */}
      <div className="orb w-96 h-96 top-[-80px] left-[-100px] opacity-40" style={{ background: 'radial-gradient(circle, #3b4fd8 0%, transparent 70%)' }} />
      <div className="orb w-80 h-80 top-[30%] right-[-60px] opacity-30" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      <div className="orb w-72 h-72 bottom-[20%] left-[20%] opacity-20" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />
      <div className="orb w-60 h-60 bottom-[-40px] right-[30%] opacity-25" style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />

      {/* ── Navegación ── */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <Logo />
            <span className="font-display font-bold text-white text-lg">EduConnect</span>
          </div>

          <div className="flex-1 max-w-md relative hidden sm:block">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(navSearch)}
              placeholder="Buscar tutores, materias…"
              aria-label="Buscar tutores o materias"
              maxLength={80}
              className="glass-input w-full pl-9 pr-4 py-2 rounded-xl text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 cursor-pointer group">
              <img
                src="https://images.unsplash.com/photo-1671029773094-faae1c044b40?w=80&h=80&fit=crop&auto=format"
                alt="Tu perfil"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/20 ring-2 ring-white/10 group-hover:ring-white/25 transition-all"
              />
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-white/90 leading-none">María J.</p>
                <p className="text-xs text-white/40 leading-none mt-0.5">2.º año · TI</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* ── Hero ── */}
        <section className="py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-white/15 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              418 tutores disponibles esta semana
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Encuentra a un compañero
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">que te ayude a estudiar</span>
            </h1>
            <p className="text-base text-white/50 mb-7 leading-relaxed">
              Tutorías entre compañeros de la UTOM. Aprende de estudiantes que ya aprobaron la materia.
            </p>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-lg">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="search"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch(heroSearch)}
                  placeholder="Materia, carrera o nombre del tutor…"
                  aria-label="Materia, carrera o nombre del tutor"
                  maxLength={80}
                  className="glass-input w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm"
                />
              </div>
              <button onClick={() => runSearch(heroSearch)} className="btn-primary px-6 py-3.5 font-semibold text-sm rounded-2xl shrink-0">
                Buscar
              </button>
            </div>
          </div>
        </section>

        {/* ── Carreras ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Explora por carrera</h2>
            {activeCareer && (
              <button
                onClick={() => handleCareerClick(activeCareer)}
                className="text-xs text-blue-300 font-semibold hover:text-white transition-colors"
              >
                ← Todas las carreras
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CAREERS.map((c) => {
              const isActive = activeCareer === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => handleCareerClick(c.id)}
                  aria-pressed={isActive}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 relative overflow-hidden ${
                    isActive
                      ? 'bg-white/20 border border-white/35 shadow-xl shadow-black/20'
                      : 'glass hover:bg-white/12 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20'
                  }`}
                >
                  {isActive && <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-60`} />}
                  <div className={`relative mb-3 ${isActive ? 'text-white' : c.accent}`}>{c.icon}</div>
                  <p className="relative text-sm font-semibold leading-tight text-white">{c.label}</p>
                  <p className="relative text-xs mt-1 text-white/50">{c.count} tutores</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Materias ── */}
        {activeCareer && !activeSubject && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-brand-orange" />
              <h2 className="text-lg font-bold text-white">Materias de {activeCareerData?.label}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSubject(s.id)}
                  className="glass rounded-2xl p-4 text-left hover:bg-white/14 hover:border-orange-400/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-150 group"
                >
                  <span className="text-2xl mb-2 block" aria-hidden="true">{s.icon}</span>
                  <p className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors">{s.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.tutorCount} tutores disponibles</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Tutores + agenda ── */}
        {showTutors && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {activeSubjectData && (
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => setActiveSubject(null)} className="text-xs text-white/40 hover:text-blue-300 transition-colors">
                        ← {activeCareerData?.label}
                      </button>
                      <span className="text-xs text-white/20">/</span>
                      <span className="text-xs text-orange-300 font-semibold">{activeSubjectData.label}</span>
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-white">
                    {activeSubjectData ? `Tutores de ${activeSubjectData.label}` : 'Resultados de búsqueda'}
                    <span className="ml-2 text-sm font-normal text-white/40">
                      — {filteredTutors.length} encontrado{filteredTutors.length === 1 ? '' : 's'}
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="#F97316" aria-hidden="true">
                    <path d="M7 1l.9 2.76H10.9l-2.45 1.78.94 2.88L7 6.9 4.61 8.42l.94-2.88L3.1 3.76H6.1L7 1z" />
                  </svg>
                  Ordenados por calificación
                </div>
              </div>

              {filteredTutors.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <p className="text-white/40 text-sm">Ningún tutor coincide con tu búsqueda.</p>
                  <button onClick={clearAll} className="mt-3 text-blue-300 text-sm font-semibold hover:text-white transition-colors">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTutors.map((t) => (
                    <TutorCard key={t.id} tutor={t} onBook={handleBook} />
                  ))}
                </div>
              )}
            </section>

            <aside id="schedule-widget" className="lg:sticky lg:top-20 lg:self-start">
              <SchedulingWidget bookedTutor={bookedTutor} onClose={() => setBookedTutor(null)} />
            </aside>
          </div>
        )}

        {/* Estado inicial */}
        {!activeCareer && !filterQuery && (
          <div className="glass rounded-2xl p-10 text-center mt-2">
            <p className="text-4xl mb-3" aria-hidden="true">🎓</p>
            <p className="font-display text-white/70 font-semibold text-base">Elige una carrera para comenzar</p>
            <p className="text-white/35 text-sm mt-1">Selecciona tu área arriba para ver materias y encontrar al tutor ideal</p>
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-night-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-display text-sm font-bold text-white/80">EduConnect</span>
          </div>
          <p className="text-xs text-white/30">© 2026 EduConnect. Tutorías entre compañeros UTOM.</p>
          <div className="flex gap-4 text-xs text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white/60 transition-colors">Términos</a>
            <a href="#" className="hover:text-white/60 transition-colors">Ayuda</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
