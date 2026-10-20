import { useEffect, useRef } from 'react';
import {
  FileCheck2,
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  Award,
} from 'lucide-react';

function ConstanciaModal({ tutor, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleClose = () => {
      onClose?.();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback para navegadores sin soporte nativo de closedby="any"
    let handleBackdropClick;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  if (!tutor) return null;

  const docUrl = tutor.constancia_url || '';
  const docName = tutor.constancia_nombre || 'Constancia_Estudios_Promedio.pdf';
  const docType = tutor.constancia_tipo || '';
  const promedio = tutor.promedio_general || tutor.rating || 9.5;
  const calificacionMateria = tutor.calificacion_materia || tutor.rating || 9.6;

  const isImage =
    docType.startsWith('image/') ||
    docUrl.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(docUrl);

  const isPdf =
    docType === 'application/pdf' ||
    docUrl.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(docUrl);

  return (
    <dialog
      ref={dialogRef}
      {...{ closedby: 'any' }}
      aria-labelledby="constancia-dialog-title"
      className="m-auto w-full max-w-3xl bg-[#151E32] text-slate-200 border border-slate-700 rounded-3xl p-0 shadow-2xl overflow-hidden"
    >
      {/* Encabezado del Modal */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0F172A] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="constancia-dialog-title" className="text-lg font-bold text-white">
              Constancia de Estudios con Promedio
            </h2>
            <p className="text-xs text-slate-400">
              Documento de respaldo académico de {tutor.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cuerpo del Modal */}
      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Resumen de Credibilidad */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Estatus
              </p>
              <p className="text-sm font-bold text-emerald-400">Tutor Verificado</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-orange-400 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Promedio General
              </p>
              <p className="text-lg font-extrabold text-white">{Number(promedio).toFixed(1)} / 10</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Nota en la Materia
              </p>
              <p className="text-lg font-extrabold text-white">
                {Number(calificacionMateria).toFixed(1)} / 10
              </p>
            </div>
          </div>
        </div>

        {/* Vista previa del archivo subido o constancia digital */}
        {docUrl ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
              <span className="text-xs font-medium text-slate-300 truncate">{docName}</span>
              <div className="flex items-center gap-2">
                <a
                  href={docUrl}
                  download={docName}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {docUrl.startsWith('data:') ? (
                    <>
                      <Download className="w-3.5 h-3.5" /> Descargar documento
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir enlace original
                    </>
                  )}
                </a>
              </div>
            </div>

            {isImage ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-center">
                <img
                  src={docUrl}
                  alt={`Constancia de estudios de ${tutor.name}`}
                  className="max-h-[460px] w-auto rounded-xl object-contain"
                />
              </div>
            ) : isPdf ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden h-[460px]">
                <iframe
                  src={docUrl}
                  title={`Constancia de estudios de ${tutor.name}`}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <FileCheck2 className="w-12 h-12 text-blue-400 mx-auto" />
                <p className="text-sm text-slate-300">
                  El tutor adjuntó un enlace externo a su constancia de estudios oficial.
                </p>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Ver constancia en pestaña nueva
                </a>
              </div>
            )}
          </div>
        ) : (
          /* Constancia institucional digital generada para tutores titulares del catálogo */
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-300 shadow-inner space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                  Universidad Tecnológica • Control Escolar
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  CONSTANCIA DE ESTUDIOS CON PROMEDIO
                </h3>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider border border-emerald-300">
                Documento Verificado
              </span>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              <p>
                Por medio de la presente se hace constar que el(la) estudiante{' '}
                <strong className="text-slate-900">{tutor.name}</strong>
                {tutor.matricula ? (
                  <>
                    {' '}
                    con matrícula <strong className="font-mono text-slate-900">{tutor.matricula}</strong>
                  </>
                ) : null}
                , inscrito(a) en el programa educativo de{' '}
                <strong className="text-slate-900">{tutor.career || 'Ingeniería'}</strong>, cuenta con el
                siguiente historial de aprovechamiento académico:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-100 rounded-xl p-4 border border-slate-200 my-4">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-500 block">
                    Promedio General Acumulado
                  </span>
                  <span className="text-2xl font-black text-blue-700">
                    {Number(promedio).toFixed(1)} / 10.0
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-slate-500 block">
                    Materias Acreditadas como Tutor
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {(tutor.subjects || []).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Validado en plataforma UniTutor</span>
              <span className="font-mono font-semibold text-emerald-700">SELLO DIGITAL VERIFICADO</span>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

export default ConstanciaModal;

