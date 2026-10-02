import { useEffect, useState } from 'react';
import { Search, Bell, Monitor, Utensils, Dna, TrendingUp, GraduationCap, CheckCircle2, BookOpen, Star, ArrowLeft, CalendarDays, Clock, User, LogOut } from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import FormularioSolicitudTutor from './components/FormularioSolicitudTutor';
import { getSession, onAuthStateChange, logout } from './lib/auth';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [showTutorForm, setShowTutorForm] = useState(false);

  const careers = [
    { id: 'it', name: 'Tecnologías de la Información', icon: Monitor },
    { id: 'gastro', name: 'Gastronomía', icon: Utensils },
    { id: 'bio', name: 'Biotecnología', icon: Dna },
    { id: 'mkt', name: 'Mercadotecnia', icon: TrendingUp },
  ];

  useEffect(() => {
    let subscription;

    getSession().then((current) => {
      setSession(current);
      setAuthLoading(false);
      subscription = onAuthStateChange(setSession);
    });

    return () => subscription?.unsubscribe();
  }, []);

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

  const handleLogout = () => {
    logout();
    setSelectedCareer(null);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setSelectedTutor(null);
    setShowTutorForm(false);
  };

  const userInitials = session.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const semesters = [
    '1er Cuatrimestre', '2do Cuatrimestre', '3er Cuatrimestre',
    '4to Cuatrimestre', '5to Cuatrimestre',
    '7mo Cuatrimestre', '8vo Cuatrimestre', '9no Cuatrimestre'
  ];

  // Mapa Curricular completo de TI y Genérico para las demás
  const subjectsData = {
    it: {
      '1er Cuatrimestre': [
        { id: 'it1-1', name: 'Inglés I', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it1-2', name: 'Desarrollo Humano y Valores', image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80' },
        { id: 'it1-3', name: 'Fundamentos Matemáticos', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
        { id: 'it1-4', name: 'Fundamentos de Redes', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80' },
        { id: 'it1-5', name: 'Física', image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80' },
        { id: 'it1-6', name: 'Fundamentos de Programación', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80' },
        { id: 'it1-7', name: 'Comunicación y Habilidades Digitales', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80' },
      ],
      '2do Cuatrimestre': [
        { id: 'it2-1', name: 'Inglés II', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it2-2', name: 'Habilidades Socioemocionales y Manejo de Conflictos', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80' },
        { id: 'it2-3', name: 'Cálculo Diferencial', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80' },
        { id: 'it2-4', name: 'Conmutación y Enrutamiento de Redes', image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80' },
        { id: 'it2-5', name: 'Probabilidad y Estadística', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
        { id: 'it2-6', name: 'Programación Estructurada', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80' },
        { id: 'it2-7', name: 'Bases de Datos', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80' },
      ],
      '3er Cuatrimestre': [
        { id: 'it3-1', name: 'Inglés III', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it3-2', name: 'Desarrollo del Pensamiento y Toma de Decisiones', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80' },
        { id: 'it3-3', name: 'Cálculo Integral', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
        { id: 'it3-4', name: 'Tópicos de Calidad para el Diseño de Software', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
        { id: 'it3-5', name: 'Programación Orientada a Objetos', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=400&q=80' },
        { id: 'it3-6', name: 'Estructura de Datos', image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80' },
        { id: 'it3-7', name: 'Sistemas Operativos', image: 'https://images.unsplash.com/photo-1629654261662-779ee3e0e4cc?w=400&q=80' },
      ],
      '4to Cuatrimestre': [
        { id: 'it4-1', name: 'Inglés IV', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it4-2', name: 'Ética Profesional', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
        { id: 'it4-3', name: 'Cálculo de Varias Variables', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80' },
        { id: 'it4-4', name: 'Aplicaciones Web', image: 'https://images.unsplash.com/photo-1627398240309-08a1a5362a53?w=400&q=80' },
        { id: 'it4-5', name: 'Desarrollo de Aplicaciones Móviles', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80' },
        { id: 'it4-6', name: 'Bases de Datos Avanzadas', image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80' },
        { id: 'it4-7', name: 'Proyecto Integrador I', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
      ],
      '5to Cuatrimestre': [
        { id: 'it5-1', name: 'Inglés V', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it5-2', name: 'Liderazgo de Equipos de Alto Desempeño', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
        { id: 'it5-3', name: 'Ecuaciones Diferenciales', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80' },
        { id: 'it5-4', name: 'Aplicaciones Web Orientadas a Servicios', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' },
        { id: 'it5-5', name: 'Análisis y Diseño de Software', image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&q=80' },
        { id: 'it5-6', name: 'Estándares y Métricas para el Desarrollo de Software', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
        { id: 'it5-7', name: 'Proyecto Integrador II', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
      ],
      '7mo Cuatrimestre': [
        { id: 'it7-1', name: 'Inglés VI', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it7-2', name: 'Habilidades Gerenciales', image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80' },
        { id: 'it7-3', name: 'Formulación de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80' },
        { id: 'it7-4', name: 'Fundamentos de Inteligencia Artificial', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80' },
        { id: 'it7-5', name: 'Ética y Legislación en Tecnologías de la Información', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80' },
        { id: 'it7-6', name: 'Optativa I', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
      ],
      '8vo Cuatrimestre': [
        { id: 'it8-1', name: 'Inglés VII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it8-2', name: 'Electrónica Digital', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80' },
        { id: 'it8-3', name: 'Gestión de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80' },
        { id: 'it8-4', name: 'Programación para Inteligencia Artificial', image: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&q=80' },
        { id: 'it8-5', name: 'Administración de Servidores', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80' },
        { id: 'it8-6', name: 'Seguridad Informática', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80' },
        { id: 'it8-7', name: 'Optativa II', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
      ],
      '9no Cuatrimestre': [
        { id: 'it9-1', name: 'Inglés VIII', image: 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80' },
        { id: 'it9-2', name: 'Internet de las Cosas', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80' },
        { id: 'it9-3', name: 'Evaluación de Proyectos de Tecnología', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
        { id: 'it9-4', name: 'Ciencia de Datos', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
        { id: 'it9-5', name: 'Tecnologías Disruptivas', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' },
        { id: 'it9-6', name: 'Informática Forense', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80' },
        { id: 'it9-7', name: 'Optativa III', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
        { id: 'it9-8', name: 'Proyecto Integrador III', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
      ],
    },
    generic: [
      { id: 'gen-1', name: 'Materia Troncal 1', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80' },
      { id: 'gen-2', name: 'Materia Troncal 2', image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80' },
      { id: 'gen-3', name: 'Asignatura Especializante', image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80' },
    ]
  };

  // Base de 9 tutores genéricos. El sistema elegirá 3 dinámicamente para cada materia.
  const baseTutors = [
    { id: 1, name: 'Carlos Axel Rodea', age: 20, rating: 5.0, reviews: 34, image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80', description: '¡Hola! Me gusta enseñar con ejemplos prácticos y proyectos reales para que la teoría tenga sentido y sea fácil de aplicar.' },
    { id: 2, name: 'Danna Paola', age: 20, rating: 4.9, reviews: 28, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80', description: 'Apasionada por el diseño y la estructura. Te ayudo a que tus proyectos no solo funcionen, sino que destaquen por su calidad.' },
    { id: 3, name: 'Luis Fernando', age: 22, rating: 4.5, reviews: 12, image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80', description: 'Si tienes problemas entendiendo conceptos complejos, soy tu mejor opción para simplificarlos y que apruebes el examen.' },
    { id: 4, name: 'María José', age: 21, rating: 4.8, reviews: 45, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80', description: 'La paciencia y dedicación son mi lema. Avanzaremos a tu propio ritmo hasta que domines el tema por completo.' },
    { id: 5, name: 'Javier Domínguez', age: 23, rating: 4.7, reviews: 19, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', description: 'Enfocado en resultados y en prepararte con simuladores de exámenes para los retos más difíciles del cuatrimestre.' },
    { id: 6, name: 'Ana Victoria', age: 19, rating: 5.0, reviews: 11, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80', description: 'Comparto mis apuntes, resúmenes organizados y trucos para aprender rápido, eficientemente y sin estrés.' },
    { id: 7, name: 'Miguel Ángel', age: 24, rating: 4.6, reviews: 33, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', description: 'Tengo experiencia asesorando a más de 30 compañeros en la universidad, siempre buscando la excelencia académica.' },
    { id: 8, name: 'Sofía Reyes', age: 20, rating: 4.9, reviews: 22, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', description: 'Haremos sesiones dinámicas e interactivas. Resolveremos guías de estudio completas para que vayas 100% seguro.' },
    { id: 9, name: 'Roberto Gómez', age: 22, rating: 4.4, reviews: 15, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80', description: 'Conmigo aprenderás la lógica y el "por qué" detrás de cada problema, no solo a memorizar procesos mecánicos.' },
  ];

  // Materias extra para rellenar los perfiles de manera coherente
  const extraSubjectsPool = [
    'Lógica y Análisis', 'Habilidades de Estudio', 'Redacción de Proyectos', 
    'Inglés Técnico', 'Metodologías de Investigación', 'Pensamiento Crítico',
    'Matemáticas Aplicadas', 'Resolución de Problemas', 'Trabajo en Equipo'
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

  // ALGORITMO: Genera 3 tutores específicos para la materia seleccionada
  const getDynamicTutors = () => {
    if (!selectedSubject) return [];
    
    // Genera un número único basado en el nombre de la materia para que los 3 tutores sean siempre los mismos en esa materia
    const seed = selectedSubject.name.length + (selectedSubject.name.charCodeAt(0));
    const careerName = careers.find(c => c.id === selectedCareer)?.name || 'Universidad';
    
    const generatedTutors = [];
    for (let i = 0; i < 3; i++) {
      // Elige 1 de los 9 tutores base
      const tutorIndex = (seed + i) % baseTutors.length;
      const baseTutor = baseTutors[tutorIndex];
      
      // Elige 2 materias extra aleatorias para complementar su perfil
      const extra1 = extraSubjectsPool[(seed + i) % extraSubjectsPool.length];
      const extra2 = extraSubjectsPool[(seed + i + 1) % extraSubjectsPool.length];
      
      generatedTutors.push({
        ...baseTutor,
        uniqueId: `${baseTutor.id}-${selectedSubject.id}`,
        career: careerName,
        // Garantizamos que SIEMPRE aparezca la materia a la que le diste clic como su especialidad #1
        subjects: [selectedSubject.name, extra1, extra2],
        hours: ['09:00 AM', '12:00 PM', '04:00 PM', '06:00 PM']
      });
    }
    return generatedTutors;
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
          <button
            onClick={() => setShowTutorForm(true)}
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-blue-400 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Ser tutor
          </button>
          <button className="relative text-slate-400 hover:text-white transition-colors">
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

        {showTutorForm ? (
          <FormularioSolicitudTutor onBack={() => setShowTutorForm(false)} />
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
              Buscas a alguien que  <br />
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
                      // 2. VISTA DE CATÁLOGO DE TUTORES GENERADA DINÁMICAMENTE
                      <div className="border-t border-slate-800 pt-8 mt-4 animate-fade-in">
                        <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-6">
                          <ArrowLeft className="w-4 h-4" /> Volver a las materias
                        </button>
                        <div className="mb-6">
                          <h4 className="text-2xl font-bold text-white">Tutores para <span className="text-blue-400">{selectedSubject.name}</span></h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {getDynamicTutors().map(tutor => (
                            <div key={tutor.uniqueId} onClick={() => setSelectedTutor(tutor)} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center text-center hover:border-blue-500 transition-colors group cursor-pointer">
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
                      // 3. VISTA DE PERFIL DEL TUTOR CON LAS 3 MATERIAS INYECTADAS
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
                                {/* Muestra exactamente las 3 materias generadas */}
                                {selectedTutor.subjects.map((sub, index) => (
                                  <span key={index} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium">
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
        </>
        )}
      </main>
    </div>
  );
}

export default App;