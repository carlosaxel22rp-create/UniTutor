import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileText,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Search,
  RefreshCw,
  GraduationCap,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  FileCheck2,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import ConstanciaModal from './ConstanciaModal';
import {
  careers,
  semesters,
  baseTutors,
  getAllSubjectsFlat,
  getSubjectsByCareerAndSemester,
  getDynamicTutorsForSubject,
} from '../lib/catalogData';

function formatFecha(timestamp) {
  if (!timestamp) return 'Reciente';
  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Reciente';
  }
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes'); // 'solicitudes' | 'materias' | 'alumnos' | 'tutores'
  const [solicitudes, setSolicitudes] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [profilesList, setProfilesList] = useState([]);
  const [dbSubjects, setDbSubjects] = useState([]);
  const [dbTutors, setDbTutors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  // Filtros de solicitudes
  const [statusFilter, setStatusFilter] = useState('todas'); // 'todas' | 'pendiente' | 'aprobado' | 'rechazado'
  const [searchSolicitud, setSearchSolicitud] = useState('');

  // Selectores de Tutores por Materia
  const [selectedCareer, setSelectedCareer] = useState('it');
  const [selectedSemester, setSelectedSemester] = useState('1er Cuatrimestre');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState('');

  // Formulario para agregar nueva materia a Firebase
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);

  // Buscador de alumnos y tutores
  const [directorySearch, setDirectorySearch] = useState('');
  const [constanciaModalTutor, setConstanciaModalTutor] = useState(null);

  const loadFirestoreCollections = async () => {
    const [solicitudesSnap, profilesSnap, subjectsSnap, tutorsSnap] = await Promise.all([
      getDocs(collection(db, 'solicitudes_tutor')),
      getDocs(collection(db, 'profiles')),
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'tutors')),
    ]);

    const map = {};
    const students = [];
    profilesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      map[docSnap.id] = { id: docSnap.id, ...data };
      if (data.role !== 'admin') {
        students.push({ id: docSnap.id, ...data });
      }
    });

    const reqItems = [];
    solicitudesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      reqItems.push({
        id: docSnap.id,
        estado: data.estado || 'pendiente',
        ...data,
      });
    });

    reqItems.sort((a, b) => {
      const tA = (a.created_at || a.createdAt)?.seconds || 0;
      const tB = (b.created_at || b.createdAt)?.seconds || 0;
      return tB - tA;
    });

    const subjectsFromFirestore = [];
    subjectsSnap.forEach((docSnap) => {
      subjectsFromFirestore.push({ id: docSnap.id, ...docSnap.data() });
    });

    const tutorsFromFirestore = [];
    tutorsSnap.forEach((docSnap) => {
      tutorsFromFirestore.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { map, students, reqItems, subjectsFromFirestore, tutorsFromFirestore };
  };

  const fetchAdminData = async () => {
    setLoadingData(true);
    setError('');
    try {
      const { map, students, reqItems, subjectsFromFirestore, tutorsFromFirestore } =
        await loadFirestoreCollections();
      setProfilesMap(map);
      setProfilesList(students);
      setSolicitudes(reqItems);
      setDbSubjects(subjectsFromFirestore);
      setDbTutors(tutorsFromFirestore);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos desde Firebase.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadFirestoreCollections()
      .then(({ map, students, reqItems, subjectsFromFirestore, tutorsFromFirestore }) => {
        if (!active) return;
        setProfilesMap(map);
        setProfilesList(students);
        setSolicitudes(reqItems);
        setDbSubjects(subjectsFromFirestore);
        setDbTutors(tutorsFromFirestore);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'No se pudieron cargar los datos desde Firebase.');
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpdateEstado = async (solicitudId, nuevoEstado) => {
    setUpdatingId(solicitudId);
    setError('');
    try {
      await updateDoc(doc(db, 'solicitudes_tutor', solicitudId), {
        estado: nuevoEstado,
      });
      setSolicitudes((prev) =>
        prev.map((item) => (item.id === solicitudId ? { ...item, estado: nuevoEstado } : item))
      );
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado de la solicitud.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSolicitud = async (solicitudId) => {
    setUpdatingId(solicitudId);
    setError('');
    try {
      await deleteDoc(doc(db, 'solicitudes_tutor', solicitudId));
      setSolicitudes((prev) => prev.filter((item) => item.id !== solicitudId));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la solicitud.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    setError('');
    try {
      const id = `${selectedCareer}-${Date.now()}`;
      const careerObj = careers.find((c) => c.id === selectedCareer);
      const newSub = {
        id,
        name: newSubjectName.trim(),
        career_id: selectedCareer,
        career_name: careerObj?.name || selectedCareer,
        semester: selectedSemester,
        image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80',
      };
      await setDoc(doc(db, 'subjects', id), newSub);
      setDbSubjects((prev) => [...prev, newSub]);
      setNewSubjectName('');
      setSelectedSubject(newSub);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la materia en Firebase.');
    } finally {
      setAddingSubject(false);
    }
  };

  // Estadísticas generales
  const totalPendientes = solicitudes.filter((s) => (s.estado || 'pendiente') === 'pendiente').length;
  const solicitudesAprobadas = solicitudes.filter((s) => s.estado === 'aprobado');
  const totalTutorsCatalog = dbTutors.length > 0 ? dbTutors : baseTutors;
  const totalSubjectsCount = dbSubjects.length > 0 ? dbSubjects.length : getAllSubjectsFlat().length;

  // Enriquecer solicitud con datos del perfil del estudiante
  const getStudentInfo = (solicitud) => {
    const profile = profilesMap[solicitud.estudiante_id];
    const name = profile?.name || solicitud.estudiante_nombre || 'Estudiante';
    const matricula = profile?.matricula || solicitud.estudiante_matricula || 'Sin matrícula';
    const careerId = profile?.career_id || solicitud.estudiante_carrera || '';
    const careerName = careers.find((c) => c.id === careerId)?.name || 'Universidad';
    const email = profile?.email || '';
    const constanciaUrl = solicitud.constancia_url || profile?.constancia_url || '';
    const constanciaNombre = solicitud.constancia_nombre || profile?.constancia_nombre || '';
    const constanciaTipo = solicitud.constancia_tipo || profile?.constancia_tipo || '';
    const promedioGeneral =
      solicitud.promedio_general || profile?.promedio_general || solicitud.calificacion_materia || 9.5;
    return {
      name,
      matricula,
      careerName,
      email,
      constanciaUrl,
      constanciaNombre,
      constanciaTipo,
      promedioGeneral,
    };
  };

  const filteredSolicitudes = solicitudes.filter((sol) => {
    const currentStatus = sol.estado || 'pendiente';
    if (statusFilter !== 'todas' && currentStatus !== statusFilter) return false;
    if (!searchSolicitud.trim()) return true;
    const q = searchSolicitud.toLowerCase();
    const student = getStudentInfo(sol);
    return (
      (sol.materia_principal || '').toLowerCase().includes(q) ||
      student.name.toLowerCase().includes(q) ||
      student.matricula.toLowerCase().includes(q)
    );
  });

  // Materias para la carrera y cuatrimestre seleccionados
  const currentSubjects = getSubjectsByCareerAndSemester(
    selectedCareer,
    selectedSemester,
    dbSubjects
  ).filter((sub) =>
    !subjectSearch.trim() ? true : sub.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // Obtener tutores para una materia (combinando los tutores base + los aprobados en Firestore para esa materia)
  const getTutorsForSubject = (subject) => {
    if (!subject) return [];
    const dynamicTutors = getDynamicTutorsForSubject(subject, selectedCareer);
    const approvedForSubject = solicitudesAprobadas
      .filter(
        (sol) =>
          (sol.materia_principal || '').trim().toLowerCase() === subject.name.trim().toLowerCase()
      )
      .map((sol) => {
        const student = getStudentInfo(sol);
        return {
          uniqueId: `firestore-${sol.id}`,
          name: student.name,
          age: 'Alumno tutor',
          rating: sol.calificacion_materia || 9.5,
          reviews: 1,
          image: null,
          career: student.careerName,
          description: sol.descripcion,
          subjects: [sol.materia_principal],
          hours: [sol.disponibilidad_horaria || 'Horario flexible'],
          isApprovedRequest: true,
          matricula: student.matricula,
        };
      });

    return [...approvedForSubject, ...dynamicTutors];
  };

  const activeSubject = selectedSubject || currentSubjects[0] || null;
  const activeSubjectTutors = activeSubject ? getTutorsForSubject(activeSubject) : [];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Encabezado de Administrador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#151E32] to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            Panel de Control Administrativo
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Gestión de Tutores, Materias y Alumnos
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-1">
            Conectado en vivo con Cloud Firestore: revisa postulaciones, materias de las 4 carreras y estudiantes registrados.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAdminData}
          disabled={loadingData}
          className="self-start md:self-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-blue-400' : ''}`} />
          Actualizar datos
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className="bg-[#151E32] hover:border-amber-500/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 text-left transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Solicitudes Pendientes</p>
            <p className="text-2xl font-extrabold text-white">{totalPendientes}</p>
            <p className="text-xs text-slate-500">{solicitudes.length} recibidas en total</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tutores')}
          className="bg-[#151E32] hover:border-emerald-500/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 text-left transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Tutores Activos</p>
            <p className="text-2xl font-extrabold text-white">
              {totalTutorsCatalog.length + solicitudesAprobadas.length}
            </p>
            <p className="text-xs text-slate-500">
              {totalTutorsCatalog.length} base + {solicitudesAprobadas.length} aprobados
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materias')}
          className="bg-[#151E32] hover:border-blue-500/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 text-left transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Materias en Base de Datos</p>
            <p className="text-2xl font-extrabold text-white">{totalSubjectsCount}</p>
            <p className="text-xs text-slate-500">4 carreras • {semesters.length} cuatrimestres</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alumnos')}
          className="bg-[#151E32] hover:border-purple-500/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 text-left transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Alumnos Registrados</p>
            <p className="text-2xl font-extrabold text-white">{profilesList.length}</p>
            <p className="text-xs text-slate-500">Ver lista de estudiantes</p>
          </div>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pestañas de navegación */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'solicitudes'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#151E32] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Solicitudes para ser Tutor
          {totalPendientes > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white">
              {totalPendientes}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materias')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'materias'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#151E32] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Materias y Tutores ({totalSubjectsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alumnos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'alumnos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#151E32] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Alumnos Registrados ({profilesList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tutores')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'tutores'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#151E32] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Plantilla de Tutores ({totalTutorsCatalog.length + solicitudesAprobadas.length})
        </button>
      </div>

      {/* PESTAÑA 1: SOLICITUDES PARA SER TUTOR */}
      {activeTab === 'solicitudes' && (
        <div className="bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'todas', label: `Todas (${solicitudes.length})` },
                { id: 'pendiente', label: `Pendientes (${totalPendientes})` },
                { id: 'aprobado', label: `Aprobadas (${solicitudesAprobadas.length})` },
                {
                  id: 'rechazado',
                  label: `Rechazadas (${solicitudes.filter((s) => s.estado === 'rechazado').length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSolicitud}
                onChange={(e) => setSearchSolicitud(e.target.value)}
                placeholder="Buscar por materia o alumno..."
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loadingData ? (
            <div className="py-16 text-center text-slate-400">Cargando solicitudes desde Firebase...</div>
          ) : filteredSolicitudes.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">No hay solicitudes en esta vista</h3>
              <p className="text-sm text-slate-400">
                Cuando un alumno envíe el formulario &ldquo;Ser tutor&rdquo;, aparecerá aquí para su aprobación.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredSolicitudes.map((sol) => {
                const student = getStudentInfo(sol);
                const estado = sol.estado || 'pendiente';
                const isUpdating = updatingId === sol.id;

                return (
                  <div
                    key={sol.id}
                    className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-block text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-md mb-2">
                            {sol.materia_principal}
                          </span>
                          <h4 className="text-lg font-bold text-white leading-snug">{student.name}</h4>
                          <p className="text-xs text-slate-400">
                            {student.matricula} • {student.careerName}
                          </p>
                          {student.email && (
                            <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              estado === 'aprobado'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : estado === 'rechazado'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {estado}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatFecha(sol.created_at || sol.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 rounded-xl p-3.5 border border-slate-800">
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-current shrink-0" />
                          <span className="text-slate-400">Calificación:</span>
                          <span className="font-bold text-white">{sol.calificacion_materia}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-slate-300 truncate" title={sol.disponibilidad_horaria}>
                            {sol.disponibilidad_horaria}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Motivo de postulación
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/40 rounded-xl p-3 border border-slate-800/80">
                          {sol.descripcion}
                        </p>
                      </div>

                      {student.constanciaUrl && (
                        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5">
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4" />
                            Constancia adjunta (Prom. {Number(student.promedioGeneral).toFixed(1)})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setConstanciaModalTutor({
                                name: student.name,
                                matricula: student.matricula,
                                career: student.careerName,
                                promedio_general: student.promedioGeneral,
                                calificacion_materia: sol.calificacion_materia,
                                constancia_url: student.constanciaUrl,
                                constancia_nombre: student.constanciaNombre,
                                constancia_tipo: student.constanciaTipo,
                                subjects: [sol.materia_principal],
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver constancia
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700/60">
                      <button
                        type="button"
                        disabled={isUpdating || estado === 'aprobado'}
                        onClick={() => handleUpdateEstado(sol.id, 'aprobado')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprobar tutor
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating || estado === 'rechazado'}
                        onClick={() => handleUpdateEstado(sol.id, 'rechazado')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                      {estado !== 'pendiente' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateEstado(sol.id, 'pendiente')}
                          className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                        >
                          Pendiente
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleDeleteSolicitud(sol.id)}
                        title="Eliminar solicitud"
                        className="p-2.5 rounded-xl bg-slate-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: MATERIAS Y TUTORES POR CARRERA Y CUATRIMESTRE */}
      {activeTab === 'materias' && (
        <div className="space-y-6">
          {/* Selector de carrera y cuatrimestre */}
          <div className="bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                1. Selecciona la Carrera
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {careers.map((career) => {
                  const Icon = career.icon;
                  const isSelected = selectedCareer === career.id;
                  return (
                    <button
                      key={career.id}
                      type="button"
                      onClick={() => {
                        setSelectedCareer(career.id);
                        setSelectedSubject(null);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500 text-white'
                          : 'bg-[#151E32] border-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="font-semibold text-sm">{career.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                2. Selecciona el Cuatrimestre (6.º y 10.º son estadías)
              </h3>
              <div className="flex flex-wrap gap-2">
                {semesters.map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setSelectedSemester(sem);
                      setSelectedSubject(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                      selectedSemester === sem
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Agregar nueva materia a este cuatrimestre en Firestore */}
            <form
              onSubmit={handleAddSubject}
              className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
            >
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder={`Agregar nueva materia a ${selectedSemester} (${careers.find((c) => c.id === selectedCareer)?.name})...`}
                className="flex-1 bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={addingSubject || !newSubjectName.trim()}
                className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                {addingSubject ? 'Guardando...' : 'Agregar materia'}
              </button>
            </form>
          </div>

          {/* Vista maestra-detalle: Materias a la izquierda y sus tutores a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de materias */}
            <div className="lg:col-span-5 bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 space-y-4 h-fit">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  Materias ({currentSubjects.length})
                </h3>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Filtrar materia..."
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {currentSubjects.map((sub) => {
                  const tutorsCount = getTutorsForSubject(sub).length;
                  const isSelected = activeSubject?.id === sub.id;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'bg-slate-800/50 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sub.image}
                          alt={sub.name}
                          className="w-10 h-10 rounded-xl object-cover bg-slate-900 shrink-0"
                        />
                        <span className="text-sm font-semibold truncate">{sub.name}</span>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {tutorsCount} tutores
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tutores de la materia seleccionada */}
            <div className="lg:col-span-7 bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 space-y-6">
              {activeSubject ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                        {selectedSemester} • {careers.find((c) => c.id === selectedCareer)?.name}
                      </p>
                      <h3 className="text-2xl font-bold text-white mt-0.5">
                        Tutores de <span className="text-blue-400">{activeSubject.name}</span>
                      </h3>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                      {activeSubjectTutors.length} disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeSubjectTutors.map((tutor) => (
                      <div
                        key={tutor.uniqueId}
                        className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-3.5 mb-3">
                            {tutor.image ? (
                              <img
                                src={tutor.image}
                                alt={tutor.name}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-700"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                {tutor.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-white">{tutor.name}</h4>
                                {tutor.isApprovedRequest && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                                    Alumno Aprobado
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {tutor.matricula ? `${tutor.matricula} • ` : ''}
                                {tutor.career}
                              </p>
                              <div className="flex items-center gap-1 text-yellow-500 mt-1">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs font-bold text-white">{tutor.rating}</span>
                                <span className="text-xs text-slate-400">({tutor.reviews} reseñas)</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed mb-3">{tutor.description}</p>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {tutor.subjects.map((subName, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[11px] font-medium"
                              >
                                {subName}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            Horarios:
                          </span>
                          <span className="text-slate-200 font-medium truncate max-w-[180px]">
                            {tutor.hours.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  Selecciona una materia para ver sus tutores asignados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ALUMNOS REGISTRADOS EN FIREBASE */}
      {activeTab === 'alumnos' && (
        <div className="bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Estudiantes Registrados ({profilesList.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alumnos dados de alta en Firebase Authentication y en la colección <code>profiles</code>.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder="Buscar por nombre, matrícula o correo..."
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {profilesList.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Aún no hay perfiles de estudiantes registrados en Firebase.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <th className="py-3.5 px-4">Estudiante</th>
                    <th className="py-3.5 px-4">Matrícula</th>
                    <th className="py-3.5 px-4">Carrera</th>
                    <th className="py-3.5 px-4">Correo</th>
                    <th className="py-3.5 px-4">Solicitudes de Tutor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {profilesList
                    .filter((p) => {
                      if (!directorySearch.trim()) return true;
                      const q = directorySearch.toLowerCase();
                      return (
                        (p.name || '').toLowerCase().includes(q) ||
                        (p.matricula || '').toLowerCase().includes(q) ||
                        (p.email || '').toLowerCase().includes(q)
                      );
                    })
                    .map((profile) => {
                      const studentSolicitudes = solicitudes.filter(
                        (s) => s.estudiante_id === profile.id
                      );
                      return (
                        <tr key={profile.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">{profile.name}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-xs">
                              {profile.matricula}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {careers.find((c) => c.id === profile.career_id)?.name || profile.career_id}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{profile.email}</td>
                          <td className="py-3.5 px-4">
                            {studentSolicitudes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {studentSolicitudes.map((sol) => (
                                  <span
                                    key={sol.id}
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                      sol.estado === 'aprobado'
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : sol.estado === 'rechazado'
                                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {sol.materia_principal} ({sol.estado || 'pendiente'})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">Sin postulaciones</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: PLANTILLA DE TUTORES */}
      {activeTab === 'tutores' && (
        <div className="bg-[#151E32]/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                Plantilla Completa de Tutores ({totalTutorsCatalog.length + solicitudesAprobadas.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tutores registrados en la colección <code>tutors</code> de Firebase más alumnos con postulación aprobada.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder="Buscar tutor..."
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {solicitudesAprobadas
              .filter((sol) => {
                if (!directorySearch.trim()) return true;
                const student = getStudentInfo(sol);
                const q = directorySearch.toLowerCase();
                return (
                  student.name.toLowerCase().includes(q) ||
                  (sol.materia_principal || '').toLowerCase().includes(q)
                );
              })
              .map((sol) => {
                const student = getStudentInfo(sol);
                return (
                  <div
                    key={`approved-${sol.id}`}
                    className="bg-slate-800/60 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white truncate">{student.name}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                          Aprobado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">
                        {student.matricula} • {sol.materia_principal}
                      </p>
                      <div className="flex items-center gap-1 text-yellow-500 mb-2">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold text-white">{sol.calificacion_materia}</span>
                        <span className="text-xs text-slate-400">(Calificación)</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{sol.descripcion}</p>
                    </div>
                  </div>
                );
              })}

            {totalTutorsCatalog
              .filter((t) =>
                !directorySearch.trim()
                  ? true
                  : t.name.toLowerCase().includes(directorySearch.toLowerCase())
              )
              .map((tutor) => (
                <div
                  key={tutor.id}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex items-start gap-4"
                >
                  <img
                    src={tutor.image}
                    alt={tutor.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{tutor.name}</h4>
                    <p className="text-xs text-slate-400 mb-1.5">{tutor.age} años • Tutor titular</p>
                    <div className="flex items-center gap-1 text-yellow-500 mb-2">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold text-white">{tutor.rating}</span>
                      <span className="text-xs text-slate-400">({tutor.reviews} reseñas)</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{tutor.description}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {constanciaModalTutor && (
        <ConstanciaModal
          tutor={constanciaModalTutor}
          onClose={() => setConstanciaModalTutor(null)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
