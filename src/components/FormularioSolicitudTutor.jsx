import { useEffect, useState } from 'react';
import {
  BookOpen,
  Star,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Upload,
  FileCheck2,
  Eye,
  Award,
  Link2,
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAllSubjectsFlat } from '../lib/catalogData';
import ConstanciaModal from './ConstanciaModal';

const MIN_CALIFICACION = 8.0;
const MAX_CALIFICACION = 10.0;
const MAX_FILE_SIZE_BYTES = 700 * 1024; // ~700 KB para almacenar de forma segura en Firestore

function validarFormulario({ materiaPrincipal, calificacion, disponibilidad, descripcion }) {
  if (!materiaPrincipal.trim()) {
    return 'Indica la materia que quieres impartir.';
  }

  const calif = parseFloat(calificacion);
  if (Number.isNaN(calif) || calif < MIN_CALIFICACION || calif > MAX_CALIFICACION) {
    return `La calificación debe estar entre ${MIN_CALIFICACION.toFixed(1)} y ${MAX_CALIFICACION.toFixed(1)}.`;
  }

  if (!disponibilidad.trim()) {
    return 'Indica tu disponibilidad de horario.';
  }

  if (!descripcion.trim()) {
    return 'Cuéntanos por qué quieres ser tutor.';
  }

  return null;
}

// Comprime imágenes en el navegador para que quepan holgadamente en un documento de Firestore
function readAndCompressFile(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagen no válido.'));
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve({
            dataUrl,
            name: file.name,
            type: 'image/jpeg',
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(
        new Error(
          'El archivo PDF supera los 700 KB. Sube una imagen (JPG/PNG) de tu constancia o pega un enlace de Google Drive/OneDrive.'
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = (e) => {
      resolve({
        dataUrl: e.target.result,
        name: file.name,
        type: file.type || 'application/pdf',
      });
    };
    reader.readAsDataURL(file);
  });
}

function FormularioSolicitudTutor({ onBack, session }) {
  const [materiaPrincipal, setMateriaPrincipal] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Solicitudes del alumno actual y estado de constancia
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [loadingMisSolicitudes, setLoadingMisSolicitudes] = useState(() => Boolean(auth.currentUser));

  const [promedioGeneral, setPromedioGeneral] = useState('9.5');
  const [constanciaUrl, setConstanciaUrl] = useState('');
  const [constanciaNombre, setConstanciaNombre] = useState('');
  const [constanciaTipo, setConstanciaTipo] = useState('');
  const [savingConstancia, setSavingConstancia] = useState(false);
  const [constanciaError, setConstanciaError] = useState('');
  const [constanciaSuccess, setConstanciaSuccess] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const allSubjects = getAllSubjectsFlat();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let active = true;
    Promise.all([
      getDocs(query(collection(db, 'solicitudes_tutor'), where('estudiante_id', '==', user.uid))),
      getDoc(doc(db, 'profiles', user.uid)),
    ])
      .then(([reqSnap, profileSnap]) => {
        if (!active) return;
        const list = [];
        reqSnap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setMisSolicitudes(list);

        if (profileSnap.exists()) {
          const p = profileSnap.data();
          if (p.promedio_general) setPromedioGeneral(String(p.promedio_general));
          if (p.constancia_url) setConstanciaUrl(p.constancia_url);
          if (p.constancia_nombre) setConstanciaNombre(p.constancia_nombre);
          if (p.constancia_tipo) setConstanciaTipo(p.constancia_tipo);
        } else {
          const withConstancia = list.find((item) => item.constancia_url);
          if (withConstancia) {
            setPromedioGeneral(String(withConstancia.promedio_general || 9.5));
            setConstanciaUrl(withConstancia.constancia_url);
            setConstanciaNombre(withConstancia.constancia_nombre || 'Constancia_Estudios.pdf');
            setConstanciaTipo(withConstancia.constancia_tipo || '');
          }
        }
      })
      .catch(() => {
        // Ignorar errores de red iniciales
      })
      .finally(() => {
        if (active) setLoadingMisSolicitudes(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const solicitudesAprobadas = misSolicitudes.filter((s) => s.estado === 'aprobado');
  const esTutorAceptado = solicitudesAprobadas.length > 0;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConstanciaError('');
    setConstanciaSuccess('');

    try {
      const processed = await readAndCompressFile(file);
      setConstanciaUrl(processed.dataUrl);
      setConstanciaNombre(processed.name);
      setConstanciaTipo(processed.type);
    } catch (err) {
      setConstanciaError(err.message);
    }
  };

  const handleGuardarConstancia = async (e) => {
    e.preventDefault();
    setConstanciaError('');
    setConstanciaSuccess('');

    const prom = parseFloat(promedioGeneral);
    if (Number.isNaN(prom) || prom < 8.0 || prom > 10.0) {
      setConstanciaError('El promedio general debe estar entre 8.0 y 10.0.');
      return;
    }

    if (!constanciaUrl.trim()) {
      setConstanciaError(
        'Sube un archivo (imagen o PDF) o pega el enlace de tu constancia de estudios.'
      );
      return;
    }

    setSavingConstancia(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Debes iniciar sesión.');

      const payload = {
        promedio_general: prom,
        constancia_url: constanciaUrl.trim(),
        constancia_nombre: constanciaNombre.trim() || 'Constancia_Estudios_Promedio.pdf',
        constancia_tipo: constanciaTipo || 'url',
        constancia_updated_at: serverTimestamp(),
      };

      // 1. Guardar en el perfil del alumno en Firestore
      await updateDoc(doc(db, 'profiles', user.uid), payload);

      // 2. Sincronizar en todas sus solicitudes aprobadas para que todos los alumnos la vean al instante
      await Promise.all(
        misSolicitudes.map((sol) =>
          updateDoc(doc(db, 'solicitudes_tutor', sol.id), {
            promedio_general: prom,
            constancia_url: constanciaUrl.trim(),
            constancia_nombre: constanciaNombre.trim() || 'Constancia_Estudios_Promedio.pdf',
            constancia_tipo: constanciaTipo || 'url',
          })
        )
      );

      setMisSolicitudes((prev) =>
        prev.map((item) => ({
          ...item,
          promedio_general: prom,
          constancia_url: constanciaUrl.trim(),
          constancia_nombre: constanciaNombre.trim() || 'Constancia_Estudios_Promedio.pdf',
          constancia_tipo: constanciaTipo || 'url',
        }))
      );

      setConstanciaSuccess(
        '¡Constancia de estudios guardada! Ahora todos los alumnos pueden verificar tu promedio y documento en tu perfil de tutor.'
      );
    } catch (err) {
      setConstanciaError(err.message || 'No se pudo guardar la constancia.');
    } finally {
      setSavingConstancia(false);
    }
  };

  const resetForm = () => {
    setMateriaPrincipal('');
    setCalificacion('');
    setDisponibilidad('');
    setDescripcion('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const validationError = validarFormulario({
      materiaPrincipal,
      calificacion,
      disponibilidad,
      descripcion,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Debes iniciar sesión para postularte.');

      const newDocData = {
        estudiante_id: user.uid,
        estudiante_nombre: session?.name || user.email || 'Estudiante',
        estudiante_matricula: session?.matricula || '',
        estudiante_carrera: session?.career || '',
        materia_principal: materiaPrincipal.trim(),
        calificacion_materia: parseFloat(calificacion),
        disponibilidad_horaria: disponibilidad.trim(),
        descripcion: descripcion.trim(),
        estado: 'pendiente',
        ...(constanciaUrl
          ? {
              promedio_general: parseFloat(promedioGeneral) || 9.5,
              constancia_url: constanciaUrl,
              constancia_nombre: constanciaNombre || 'Constancia_Estudios_Promedio.pdf',
              constancia_tipo: constanciaTipo || 'url',
            }
          : {}),
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'solicitudes_tutor'), newDocData);
      setMisSolicitudes((prev) => [{ id: docRef.id, ...newDocData }, ...prev]);

      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err.message || 'No se pudo enviar tu solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </button>

      {/* SECCIÓN EXCLUSIVA PARA ALUMNOS YA ACEPTADOS COMO TUTORES */}
      {!loadingMisSolicitudes && esTutorAceptado && (
        <div className="bg-gradient-to-br from-[#151E32] to-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tutor Aceptado
              </span>
              <h2 className="text-2xl font-extrabold text-white">
                Mi Perfil de Tutor • Constancia de Estudios
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Sube tu constancia de estudios con promedio para que los demás alumnos verifiquen tu credibilidad académica.
              </p>
            </div>

            {constanciaUrl && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="self-start sm:self-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Eye className="w-4 h-4" /> Ver mi constancia
              </button>
            )}
          </div>

          {/* Materias aprobadas */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Materias en las que estás aprobado como tutor:
            </p>
            <div className="flex flex-wrap gap-2">
              {solicitudesAprobadas.map((sol) => (
                <span
                  key={sol.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {sol.materia_principal} (Nota: {sol.calificacion_materia})
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleGuardarConstancia} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="promedio-constancia"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Promedio general en tu constancia
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-orange-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="promedio-constancia"
                    type="number"
                    min="8.0"
                    max="10.0"
                    step="0.1"
                    value={promedioGeneral}
                    onChange={(e) => setPromedioGeneral(e.target.value)}
                    placeholder="Ej. 9.6"
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="archivo-constancia"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Subir archivo (Imagen JPG/PNG o PDF)
                </label>
                <label
                  htmlFor="archivo-constancia"
                  className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {constanciaNombre || 'Seleccionar constancia desde mi equipo'}
                  </span>
                  <input
                    id="archivo-constancia"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="enlace-constancia"
                className="block text-xs font-medium text-slate-400 mb-1.5"
              >
                O bien, pega un enlace a tu constancia (Google Drive, OneDrive o documento institucional):
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="enlace-constancia"
                  type="url"
                  value={constanciaUrl.startsWith('data:') ? '' : constanciaUrl}
                  onChange={(e) => {
                    setConstanciaUrl(e.target.value);
                    setConstanciaNombre('Constancia_Enlace_Externo.pdf');
                    setConstanciaTipo('url');
                  }}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              {constanciaUrl.startsWith('data:') && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4" /> Archivo cargado listo para guardar:{' '}
                  <strong>{constanciaNombre}</strong>
                </p>
              )}
            </div>

            {constanciaError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {constanciaError}
              </div>
            )}

            {constanciaSuccess && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {constanciaSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={savingConstancia}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              {savingConstancia
                ? 'Guardando constancia en tu perfil...'
                : 'Guardar Constancia de Estudios en mi Perfil'}
            </button>
          </form>
        </div>
      )}

      {/* HISTORIAL DE SOLICITUDES DEL ALUMNO */}
      {!loadingMisSolicitudes && misSolicitudes.length > 0 && (
        <div className="bg-[#151E32] border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Estado de mis postulaciones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {misSolicitudes.map((sol) => (
              <div
                key={sol.id}
                className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-white text-sm">{sol.materia_principal}</p>
                  <p className="text-xs text-slate-400">
                    Calificación: {sol.calificacion_materia} • {sol.disponibilidad_horaria}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                    sol.estado === 'aprobado'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : sol.estado === 'rechazado'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {sol.estado || 'pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULARIO PARA POSTULARSE A UNA MATERIA */}
      <div className="bg-[#151E32] border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-white">Postúlate como tutor</h2>
        </div>
        <p className="text-sm text-slate-400 mb-8">
          Comparte lo que sabes y ayuda a otros estudiantes. Una vez que el administrador apruebe tu solicitud, podrás subir tu constancia de estudios con promedio en esta misma sección.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label
              htmlFor="materia-principal"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Materia que quieres impartir
            </label>
            <input
              id="materia-principal"
              list="catalogo-materias"
              type="text"
              value={materiaPrincipal}
              onChange={(e) => setMateriaPrincipal(e.target.value)}
              placeholder="Ej. Estructura de Datos (elige de la lista o escribe)"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              required
            />
            <datalist id="catalogo-materias">
              {Array.from(new Set(allSubjects.map((s) => s.name))).map((subName) => (
                <option key={subName} value={subName} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="calificacion-materia"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Calificación obtenida (mínimo {MIN_CALIFICACION.toFixed(1)})
            </label>
            <div className="relative">
              <Star className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="calificacion-materia"
                type="number"
                min={MIN_CALIFICACION}
                max={MAX_CALIFICACION}
                step="0.1"
                value={calificacion}
                onChange={(e) => setCalificacion(e.target.value)}
                placeholder="Ej. 9.5"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="disponibilidad-horaria"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Disponibilidad de horario
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="disponibilidad-horaria"
                type="text"
                value={disponibilidad}
                onChange={(e) => setDisponibilidad(e.target.value)}
                placeholder="Ej. Lunes a viernes, 4pm - 6pm"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="descripcion-tutor"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Cuéntanos por qué quieres ser tutor
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <textarea
                id="descripcion-tutor"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Llevé la materia el cuatrimestre pasado y me gustaría ayudar a otros a entenderla..."
                rows={4}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ¡Solicitud enviada! Quedó en estado pendiente — te avisaremos cuando sea revisada.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 mt-2"
          >
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>

      {previewModalOpen && (
        <ConstanciaModal
          tutor={{
            name: session?.name || 'Mi Perfil de Tutor',
            matricula: session?.matricula || '',
            career: session?.career || '',
            promedio_general: promedioGeneral,
            calificacion_materia: solicitudesAprobadas[0]?.calificacion_materia || 9.5,
            constancia_url: constanciaUrl,
            constancia_nombre: constanciaNombre,
            constancia_tipo: constanciaTipo,
            subjects: solicitudesAprobadas.map((s) => s.materia_principal),
          }}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </div>
  );
}

export default FormularioSolicitudTutor;
