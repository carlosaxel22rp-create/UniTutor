import { useState } from 'react';
import { Search, Bell, Monitor, Utensils, Dna, TrendingUp, GraduationCap, CheckCircle2, BookOpen, Star, ArrowLeft, CalendarDays, Clock, User } from 'lucide-react';

function App() {
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);

  const careers = [
    { id: 'it', name: 'Tecnologías de la Información', icon: Monitor },
    { id: 'gastro', name: 'Gastronomía', icon: Utensils },
    { id: 'bio', name: 'Biotecnología', icon: Dna },
    { id: 'mkt', name: 'Mercadotecnia', icon: TrendingUp },
  ];

  const semesters = [
    '1er Cuatrimestre', '2do Cuatrimestre', '3er Cuatrimestre',
    '4to Cuatrimestre', '5to Cuatrimestre', '6to Cuatrimestre',
    '7mo Cuatrimestre', '8vo Cuatrimestre', '9no Cuatrimestre', '10mo Cuatrimestre'
  ];

  const subjectsData = {
    it: {
      '1er Cuatrimestre': [
        { id: 'it1-1', name: 'Fundamentos de Programación', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80' },
        { id: 'it1-2', name: 'Fundamentos Matemáticos', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
        { id: 'it1-3', name: 'Fundamentos de Redes', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80' },
      ],
      '2do Cuatrimestre': [
        { id: 'it2-1', name: 'Bases de Datos', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80' },
        { id: 'it2-2', name: 'Programación Estructurada', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80' },
      ],
    },
    generic: [
      { id: 'gen-1', name: 'Materia Troncal 1', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80' },
      { id: 'gen-2', name: 'Materia Troncal 2', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80' },
    ]
  };

  const mockTutors = [
    { 
      id: 1, 
      name: 'Carlos Axel Rodea', 
      age: 20,
      career: 'Tecnologías de la Información',
      rating: 5.0, 
      reviews: 34, 
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      description: '¡Hola! Me especializo en Desarrollo Web (React, Tailwind) y Bases de Datos (PostgreSQL, MySQL). Me gusta enseñar con ejemplos prácticos y proyectos reales para que el código tenga sentido.',
      subjects: ['Bases de Datos', 'Programación Web', 'Fundamentos de Programación'],
      hours: ['10:00 AM', '11:00 AM', '04:00 PM', '05:00 PM']
    },
    { 
      id: 2, 
      name: 'Danna Paola', 
      age: 20,
      career: 'Tecnologías de la Información',
      rating: 4.9, 
      reviews: 28, 
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      description: 'Apasionada por el diseño de interfaces (UI/UX) y el desarrollo frontend. Te ayudo a que tus proyectos no solo funcionen, sino que se vean increíbles y profesionales.',
      subjects: ['Diseño de Interfaces', 'Programación Estructurada', 'Física'],
      hours: ['09:00 AM', '12:00 PM', '06:00 PM']
    },
    { 
      id: 3, 
      name: 'Luis Fernando', 
      age: 22,
      career: 'Tecnologías de la Información',
      rating: 4.5, 
      reviews: 12, 
      image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80',
      description: 'Experto en redes y seguridad informática. Si tienes problemas configurando enrutadores o entendiendo el modelo OSI, soy tu mejor opción.',
      subjects: ['Fundamentos de Redes', 'Sistemas Operativos'],
      hours: ['08:00 AM', '02:00 PM', '03:00 PM']
    }
  ];

  const handleCareerSelect = (careerId) => {
    setSelectedCareer(careerId);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setSelectedTutor(null);
  };

  const handleSemesterSelect = (sem) => {
    setSelectedSemester(sem);
    setSelectedSubject(null);
    setSelectedTutor(null);
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setSelectedTutor(null);
  };

  const getSubjects = () => {
    if (!selectedCareer || !selectedSemester) return [];
    if (selectedCareer === 'it' && subjectsData.it[selectedSemester]) {
      return subjectsData.it[selectedSemester];
    }
    return subjectsData.generic;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-orange-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-white tracking-wide">UniTutor</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-orange-500 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A]"></span>
          </button>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 flex items-center justify-center overflow-hidden">
              <span className="text-sm font-bold text-white">MJ</span>
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-semibold text-white leading-tight">María J.</p>
              <p className="text-xs text-slate-400">Estudiante · TI</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* HERO SECTION RESTAURADA - Se oculta si hay un tutor seleccionado para dar espacio al perfil */}
        {!selectedTutor && (
          <div className="mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-xs font-medium text-slate-300">Tutores nuevos cada semana</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
              Buscas a alguien que  <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                te pueda ayudar a aprender?
              </span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-2xl mb-10">
              Peer-to-peer tutoring built for your university. Learn from students who already passed the course.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1 flex items-center bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-blue-500 transition-colors">
                <input 
                  type="text" 
                  placeholder="Carrera, materia..." 
                  className="bg-transparent border-none outline-none text-slate-200 w-full placeholder-slate-500"
                />
              </div>
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/20">
                Buscar
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Career Section */}
        <div>
          {!selectedTutor && (
            <>
              <h2 className="text-xl font-bold text-white mb-6">Busca tu carrera</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {careers.map((career) => {
                  const Icon = career.icon;
                  const isSelected = selectedCareer === career.id;
                  return (
                    <button
                      key={career.id}
                      onClick={() => handleCareerSelect(career.id)}
                      className={`flex flex-col items-start p-6 rounded-2xl border text-left transition-all ${
                        isSelected ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500' : 'bg-[#151E32] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="font-semibold text-white mb-1">{career.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="bg-[#151E32]/50 border border-slate-800 rounded-3xl p-8 md:p-12 flex flex-col min-h-[300px]">
            {!selectedCareer ? (
              <div className="text-center animate-fade-in m-auto">
                <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-white mb-2">Selecciona tu carrera y empieza a aprender</h3>
              </div>
            ) : (
              <div className="animate-fade-in w-full">
                {/* Ocultar botones de cuatrimestre si ya estamos viendo un tutor */}
                {!selectedTutor && (
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">
                      {careers.find(c => c.id === selectedCareer)?.name} - Selecciona un Cuatrimestre
                    </h3>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {semesters.map((sem) => (
                        <button 
                          key={sem}
                          onClick={() => handleSemesterSelect(sem)}
                          className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                            selectedSemester === sem ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                        >
                          {sem}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSemester && (
                  <div className="animate-fade-in">
                    
                    {!selectedSubject ? (
                      // 1. VISTA DE MATERIAS
                      <div className="border-t border-slate-800 pt-8 mt-4">
                        <div className="flex items-center gap-2 mb-6">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          <h4 className="text-lg font-semibold text-white">Materias Disponibles ({selectedSemester})</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {getSubjects().map(subject => (
                            <div key={subject.id} onClick={() => handleSubjectSelect(subject)} className="bg-slate-800/80 rounded-2xl overflow-hidden border border-slate-700 hover:border-orange-500 transition-all group cursor-pointer hover:shadow-lg flex flex-col">
                              <div className="h-32 overflow-hidden bg-slate-900">
                                <img src={subject.image} alt={subject.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" loading="lazy" />
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <h5 className="font-bold text-white mb-2 text-sm leading-tight">{subject.name}</h5>
                                <p className="text-xs text-slate-400 group-hover:text-orange-400 transition-colors font-medium">Ver tutores →</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : !selectedTutor ? (
                      // 2. VISTA DE CATÁLOGO DE TUTORES
                      <div className="border-t border-slate-800 pt-8 mt-4 animate-fade-in">
                        <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-6">
                          <ArrowLeft className="w-4 h-4" /> Volver a las materias
                        </button>
                        <div className="mb-6">
                          <h4 className="text-2xl font-bold text-white">Tutores para <span className="text-blue-400">{selectedSubject.name}</span></h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {mockTutors.map(tutor => (
                            <div key={tutor.id} onClick={() => setSelectedTutor(tutor)} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center text-center hover:border-blue-500 transition-colors group cursor-pointer">
                              <img src={tutor.image} alt={tutor.name} className="w-20 h-20 rounded-full object-cover mb-4 ring-2 ring-slate-700 group-hover:ring-blue-500 transition-all"/>
                              <h5 className="font-bold text-white mb-1">{tutor.name}</h5>
                              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="text-sm font-bold text-white">{tutor.rating}</span>
                                <span className="text-xs text-slate-400">({tutor.reviews})</span>
                              </div>
                              <button className="w-full bg-slate-700 group-hover:bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors mt-auto">
                                Ver Perfil
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // 3. VISTA DE PERFIL DEL TUTOR
                      <div className="animate-fade-in">
                        <button onClick={() => setSelectedTutor(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8">
                          <ArrowLeft className="w-4 h-4" /> Volver a los tutores
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                              <img src={selectedTutor.image} alt={selectedTutor.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-800 shadow-xl" />
                              <div>
                                <h2 className="text-3xl font-extrabold text-white mb-2">{selectedTutor.name}</h2>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-3">
                                  <span className="flex items-center gap-1"><User className="w-4 h-4"/> {selectedTutor.age} años</span>
                                  <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4"/> {selectedTutor.career}</span>
                                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="font-bold">{selectedTutor.rating}</span>
                                    <span className="text-slate-400 ml-1">({selectedTutor.reviews} reseñas)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                              <h3 className="text-lg font-bold text-white mb-3">Sobre mí</h3>
                              <p className="text-slate-300 leading-relaxed">{selectedTutor.description}</p>
                            </div>

                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                              <h3 className="text-lg font-bold text-white mb-4">Materias que imparto</h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedTutor.subjects.map(sub => (
                                  <span key={sub} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 h-fit sticky top-24">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                              <CalendarDays className="w-5 h-5 text-orange-500" /> Agendar Tutoría
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">Selecciona un horario disponible para tu sesión virtual.</p>

                            <div className="flex justify-between items-center mb-4 bg-slate-900/50 rounded-xl p-2">
                              {['Lun 12', 'Mar 13', 'Mié 14'].map((day, i) => (
                                <button key={day} className={`flex-1 py-2 text-center rounded-lg text-sm font-medium transition-colors ${i === 0 ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                  {day}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                              {selectedTutor.hours.map(hour => (
                                <button key={hour} className="flex items-center justify-center gap-2 py-3 bg-slate-700/50 hover:bg-orange-500/20 border border-slate-600 hover:border-orange-500 rounded-xl text-sm font-medium text-slate-200 transition-all focus:bg-orange-500 focus:text-white focus:border-orange-500">
                                  <Clock className="w-4 h-4" /> {hour}
                                </button>
                              ))}
                            </div>

                            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2">
                              Confirmar y Pagar
                            </button>
                            <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pago seguro vía Stripe
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;