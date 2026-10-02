import { useState } from 'react';
import { BookOpen, Star, Clock, FileText, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const MIN_CALIFICACION = 8.0;
const MAX_CALIFICACION = 10.0;

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

function FormularioSolicitudTutor({ onBack }) {
  const [materiaPrincipal, setMateriaPrincipal] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

    const validationError = validarFormulario({ materiaPrincipal, calificacion, disponibilidad, descripcion });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // estudiante_id lo asigna la base de datos (default auth.uid()); nunca lo
      // mandamos desde el cliente para que no se pueda suplantar a otro estudiante.
      const { error: insertError } = await supabase.from('solicitudes_tutor').insert({
        materia_principal: materiaPrincipal.trim(),
        calificacion_materia: parseFloat(calificacion),
        disponibilidad_horaria: disponibilidad.trim(),
        descripcion: descripcion.trim(),
      });

      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err.message || 'No se pudo enviar tu solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="bg-[#151E32] border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-white">Postúlate como tutor</h2>
        </div>
        <p className="text-sm text-slate-400 mb-8">
          Comparte lo que sabes y ayuda a otros estudiantes. Revisaremos tu solicitud y te avisaremos cuando sea
          aprobada.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Materia que quieres impartir</label>
            <input
              type="text"
              value={materiaPrincipal}
              onChange={(e) => setMateriaPrincipal(e.target.value)}
              placeholder="Ej. Estructura de Datos"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Calificación obtenida (mínimo {MIN_CALIFICACION.toFixed(1)})
            </label>
            <div className="relative">
              <Star className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Disponibilidad de horario</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Cuéntanos por qué quieres ser tutor
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <textarea
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
    </div>
  );
}

export default FormularioSolicitudTutor;
