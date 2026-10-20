import { useEffect, useState } from 'react';
import {
  Bell,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  Star,
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  LogOut,
  ShieldCheck,
  FileCheck2,
  Award,
  Eye,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import AuthScreen from './components/AuthScreen';
import FormularioSolicitudTutor from './components/FormularioSolicitudTutor';
import AdminDashboard from './components/AdminDashboard';
import ConstanciaModal from './components/ConstanciaModal';
import { getSession, onAuthStateChange, logout } from './lib/auth';
import {
  careers,
  semesters,
  getSubjectsByCareerAndSemester,
  getDynamicTutorsForSubject,
} from './lib/catalogData';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [showTutorForm, setShowTutorForm] = useState(false);
  const [dbSubjects, setDbSubjects] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [constanciaModalTutor, setConstanciaModalTutor] = useState(null);

  useEffect(() => {
    let subscription;

    getSession().then((current) => {
      setSession(current);
      setAuthLoading(false);
      subscription = onAuthStateChange(setSession);
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || session.role === 'admin') return;
    let active = true;

    Promise.all([
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'solicitudes_tutor')),
      getDocs(collection(db, 'profiles')),
    ])
      .then(([subjectsSnap, reqSnap, profilesSnap]) => {
        if (!active) return;
        const subs = [];
        subjectsSnap.forEach((d) => subs.push({ id: d.id, ...d.data() }));
        setDbSubjects(subs);

        const pMap = {};
        profilesSnap.forEach((d) => {
          pMap[d.id] = { id: d.id, ...d.data() };
        });
        setProfilesById(pMap);

        const approved = [];
        reqSnap.forEach((d) => {
          const data = d.data();
          if (data.estado === 'aprobado') {
            approved.push({ id: d.id, ...data });
          }
        });
        setApprovedRequests(approved);
      })
      .catch(() => {
        // Si falla la red se mantiene el catálogo base
      });

    return () => {
      active = false;
    };
  }, [session, showTutorForm]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen careers={careers} onAuthSuccess={setSession} />;
  }

  const isAdmin = session.role === 'admin';
  const currentUid = auth.currentUser?.uid;
  const isCurrentStudentApprovedTutor = approvedRequests.some(
    (req) => req.estudiante_id === currentUid
  );

  const handleLogout = () => {
    logout();
    setSelectedCareer(null);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setSelectedTutor(null);
    setShowTutorForm(false);
  };

  const userInitials = (session.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

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

  const getSubjects = () =>
    getSubjectsByCareerAndSemester(selectedCareer, selectedSemester, dbSubjects);

  const getDynamicTutors = () => {
    const base = getDynamicTutorsForSubject(selectedSubject, selectedCareer).map((t) => ({
      ...t,
      promedio_general: t.rating,
      calificacion_materia: Math.min(10, Number((t.rating + 0.1).toFixed(1))),
      hasVerifiedConstancia: true,
    }));
    if (!selectedSubject) return base;

    const fromApproved = approvedRequests
      .filter(
        (req) =>
          (req.materia_principal || '').trim().toLowerCase() ===
          selectedSubject.name.trim().toLowerCase()
      )
      .map((req) => {
        const profile = profilesById[req.estudiante_id] || {};
        const constanciaUrl = req.constancia_url || profile.constancia_url || '';
        const constanciaNombre =
          req.constancia_nombre || profile.constancia_nombre || 'Constancia_Estudios.pdf';
        const constanciaTipo = req.constancia_tipo || profile.constancia_tipo || '';
        const promedioGeneral =
          req.promedio_general || profile.promedio_general || req.calificacion_materia || 9.5;

        return {
          uniqueId: `approved-${req.id}`,
          name: profile.name || req.estudiante_nombre || 'Estudiante Tutor',
          matricula: profile.matricula || req.estudiante_matricula || '',
          age: 20,
          rating: req.calificacion_materia || 9.5,
          calificacion_materia: req.calificacion_materia || 9.5,
          promedio_general: promedioGeneral,
          reviews: 1,
          image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
          career:
            careers.find((c) => c.id === (profile.career_id || req.estudiante_carrera || selectedCareer))
              ?.name || 'Universidad',
          description: req.descripcion,
          subjects: [selectedSubject.name],
          hours: [req.disponibilidad_horaria || '04:00 PM'],
          constancia_url: constanciaUrl,
          constancia_nombre: constanciaNombre,
          constancia_tipo: constanciaTipo,
          hasVerifiedConstancia: Boolean(constanciaUrl),
          isApprovedStudentTutor: true,
        };
      });

    return [...fromApproved, ...base];
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-orange-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-white tracking-wide">UniTutor</span>
          {isAdmin && (
            <span className="ml-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setShowTutorForm(true)}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                isCurrentStudentApprovedTutor
                  ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl'
                  : 'text-slate-300 hover:text-blue-400'
              }`}
            >
              {isCurrentStudentApprovedTutor ? (
                <>
                  <FileCheck2 className="w-4 h-4" /> Mi perfil de tutor
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" /> Ser tutor
                </>
              )}
            </button>
          )}
          <button type="button" className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-orange-500 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A]"></span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 flex items-center justify-center overflow-hidden">
              <span className="text-sm font-bold text-white">{userInitials}</span>
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-semibold text-white leading-tight">{session.name}</p>
              <p className="text-xs text-slate-400">{session.matricula}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {isAdmin ? (
          <AdminDashboard />
        ) : showTutorForm ? (
          <FormularioSolicitudTutor session={session} onBack={() => setShowTutorForm(false)} />
        ) : (
          <>
            {/* HERO SECTION - Se oculta al seleccionar tutor */}
            {!selectedTutor && (
              <div className="mb-16 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 mb-6">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-medium text-slate-300">Tutores nuevos cada semana</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
                  Buscas a alguien que <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                    te pueda ayudar a aprender?
                  </span>
                </h1>

                <p className="text-lg text-slate-400 max-w-2xl mb-10">
                  Tutorías entre compañeros para tu universidad. Aprende de estudiantes que ya pasaron la materia.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                  <div className="flex-1 flex items-center bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-blue-500 transition-colors">
                    <input
                      type="text"
                      placeholder="Carrera, materia..."
                      className="bg-transparent border-none outline-none text-slate-200 w-full placeholder-slate-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/20"
                  >
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
                          type="button"
                          onClick={() => handleCareerSelect(career.id)}
                          className={`flex flex-col items-start p-6 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-[#151E32] border-slate-800 hover:border-slate-600'
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
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Selecciona tu carrera y empieza a aprender
                    </h3>
                  </div>
                ) : (
                  <div className="animate-fade-in w-full">
                    {!selectedTutor && (
                      <div className="text-center mb-8">
                        <h3 className="text-xl font-bold text-white mb-4">
                          {careers.find((c) => c.id === selectedCareer)?.name} - Selecciona un Cuatrimestre
                        </h3>
                        <div className="flex gap-3 justify-center flex-wrap">
                          {semesters.map((sem) => (
                            <button
                              key={sem}
                              type="button"
                              onClick={() => handleSemesterSelect(sem)}
                              className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                                selectedSemester === sem
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
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
                              <h4 className="text-lg font-semibold text-white">
                                Materias Disponibles ({selectedSemester})
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                              {getSubjects().map((subject) => (
                                <div
                                  key={subject.id}
                                  onClick={() => handleSubjectSelect(subject)}
                                  className="bg-slate-800/80 rounded-2xl overflow-hidden border border-slate-700 hover:border-orange-500 transition-all group cursor-pointer hover:shadow-lg flex flex-col"
                                >
                                  <div className="h-32 overflow-hidden bg-slate-900">
                                    <img
                                      src={subject.image}
                                      alt={subject.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="p-4 flex-1 flex flex-col justify-between">
                                    <h5 className="font-bold text-white mb-2 text-sm leading-tight">{subject.name}</h5>
                                    <p className="text-xs text-slate-400 group-hover:text-orange-400 transition-colors font-medium">
                                      Ver tutores →
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : !selectedTutor ? (
                          // 2. VISTA DE CATÁLOGO DE TUTORES GENERADA DINÁMICAMENTE
                          <div className="border-t border-slate-800 pt-8 mt-4 animate-fade-in">
                            <button
                              type="button"
                              onClick={() => setSelectedSubject(null)}
                              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-6"
                            >
                              <ArrowLeft className="w-4 h-4" /> Volver a las materias
                            </button>
                            <div className="mb-6">
                              <h4 className="text-2xl font-bold text-white">
                                Tutores para <span className="text-blue-400">{selectedSubject.name}</span>
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {getDynamicTutors().map((tutor) => (
                                <div
                                  key={tutor.uniqueId}
                                  onClick={() => setSelectedTutor(tutor)}
                                  className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center text-center hover:border-blue-500 transition-colors group cursor-pointer"
                                >
                                  <img
                                    src={tutor.image}
                                    alt={tutor.name}
                                    className="w-20 h-20 rounded-full object-cover mb-4 ring-2 ring-slate-700 group-hover:ring-blue-500 transition-all"
                                  />
                                  <h5 className="font-bold text-white mb-1">{tutor.name}</h5>
                                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="text-sm font-bold text-white">{tutor.rating}</span>
                                    <span className="text-xs text-slate-400">({tutor.reviews})</span>
                                  </div>

                                  {tutor.hasVerifiedConstancia && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold mb-4">
                                      <FileCheck2 className="w-3 h-3" />
                                      Promedio {Number(tutor.promedio_general || tutor.rating).toFixed(1)}
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    className="w-full bg-slate-700 group-hover:bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors mt-auto"
                                  >
                                    Ver Perfil
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // 3. VISTA DE PERFIL DEL TUTOR CON CREDIBILIDAD ACADÉMICA Y CONSTANCIA
                          <div className="animate-fade-in">
                            <button
                              type="button"
                              onClick={() => setSelectedTutor(null)}
                              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8"
                            >
                              <ArrowLeft className="w-4 h-4" /> Volver a los tutores
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              <div className="lg:col-span-2 flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                                  <img
                                    src={selectedTutor.image}
                                    alt={selectedTutor.name}
                                    className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-800 shadow-xl"
                                  />
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h2 className="text-3xl font-extrabold text-white">{selectedTutor.name}</h2>
                                      {selectedTutor.hasVerifiedConstancia && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                          <FileCheck2 className="w-3.5 h-3.5" /> Constancia Verificada
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-3">
                                      <span className="flex items-center gap-1">
                                        <User className="w-4 h-4" /> {selectedTutor.age} años
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="w-4 h-4" /> {selectedTutor.career}
                                      </span>
                                      <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="font-bold">{selectedTutor.rating}</span>
                                        <span className="text-slate-400 ml-1">({selectedTutor.reviews} reseñas)</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* TARJETA DE CREDIBILIDAD ACADÉMICA Y CONSTANCIA DE ESTUDIOS */}
                                <div className="bg-gradient-to-r from-emerald-950/40 to-slate-800/60 p-6 rounded-3xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                      <Award className="w-5 h-5" />
                                      Credibilidad Académica • Constancia de Estudios
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                      Promedio general reportado en constancia:{' '}
                                      <strong className="text-white text-sm">
                                        {Number(selectedTutor.promedio_general || selectedTutor.rating).toFixed(1)} / 10
                                      </strong>{' '}
                                      • Calificación en {selectedSubject?.name}:{' '}
                                      <strong className="text-white text-sm">
                                        {Number(selectedTutor.calificacion_materia || selectedTutor.rating).toFixed(1)} / 10
                                      </strong>
                                    </p>
                                    {selectedTutor.isApprovedStudentTutor && !selectedTutor.constancia_url && (
                                      <p className="text-xs text-amber-400">
                                        Este alumno tutor fue aprobado recientemente y aún no adjunta su archivo digital.
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setConstanciaModalTutor(selectedTutor)}
                                    className="shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Ver Constancia con Promedio
                                  </button>
                                </div>

                                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                                  <h3 className="text-lg font-bold text-white mb-3">Sobre mí</h3>
                                  <p className="text-slate-300 leading-relaxed">{selectedTutor.description}</p>
                                </div>

                                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                                  <h3 className="text-lg font-bold text-white mb-4">Materias que imparto</h3>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedTutor.subjects.map((sub, index) => (
                                      <span
                                        key={index}
                                        className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium"
                                      >
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
                                <p className="text-sm text-slate-400 mb-6">
                                  Selecciona un horario disponible para tu sesión virtual.
                                </p>

                                <div className="flex justify-between items-center mb-4 bg-slate-900/50 rounded-xl p-2">
                                  {['Lun 12', 'Mar 13', 'Mié 14'].map((day, i) => (
                                    <button
                                      key={day}
                                      type="button"
                                      className={`flex-1 py-2 text-center rounded-lg text-sm font-medium transition-colors ${
                                        i === 0 ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                  {selectedTutor.hours.map((hour) => (
                                    <button
                                      key={hour}
                                      type="button"
                                      className="flex items-center justify-center gap-2 py-3 bg-slate-700/50 hover:bg-orange-500/20 border border-slate-600 hover:border-orange-500 rounded-xl text-sm font-medium text-slate-200 transition-all focus:bg-orange-500 focus:text-white focus:border-orange-500"
                                    >
                                      <Clock className="w-4 h-4" /> {hour}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2"
                                >
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
          </>
        )}
      </main>

      {constanciaModalTutor && (
        <ConstanciaModal
          tutor={constanciaModalTutor}
          onClose={() => setConstanciaModalTutor(null)}
        />
      )}
    </div>
  );
}

export default App;
