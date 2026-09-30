'use client'
import { useState } from 'react'
import { CheckoutPanel } from '../checkout/CheckoutPanel'
import { TutorCard, type TutorCardData } from './TutorCard'

export function TutorGrid({ tutors, subjectId }: { tutors: TutorCardData[]; subjectId: number | null }) {
  const [selected, setSelected] = useState<TutorCardData | null>(null)

  if (tutors.length === 0) {
    return <p className="glass rounded-2xl p-10 text-center text-white/50">No hay tutores para esta búsqueda.</p>
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tutors.map((t) => (
          <TutorCard key={t.tutor_id} tutor={t} onBook={setSelected} />
        ))}
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        {selected && subjectId ? (
          <CheckoutPanel tutor={selected} subjectId={subjectId} onClose={() => setSelected(null)} />
        ) : (
          <p className="glass rounded-2xl p-6 text-sm text-white/50">Elige una materia y un tutor para ver sus horarios.</p>
        )}
      </aside>
    </div>
  )
}
