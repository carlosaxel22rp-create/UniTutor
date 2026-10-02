import { useState } from 'react';
import { CheckCircle2, GraduationCap, AlertCircle } from 'lucide-react';
import { registerUser, loginUser, validateMatricula, validatePassword } from '../lib/auth';

function AuthScreen({ careers, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [career, setCareer] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matriculaTouched, setMatriculaTouched] = useState(false);

  const matriculaError = matriculaTouched
    ? validateMatricula(matricula, mode === 'register' ? career : undefined)
    : null;

  const resetFields = () => {
    setName('');
    setMatricula('');
    setCareer('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setMatriculaTouched(false);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetFields();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        const session = await registerUser({ name, matricula, career, email, password });
        onAuthSuccess(session);
      } else {
        const session = await loginUser({ matricula, password });
        onAuthSuccess(session);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <CheckCircle2 className="w-7 h-7 text-blue-500" />
          <span className="text-2xl font-bold text-white tracking-wide">UniTutor</span>
        </div>

        <div className="bg-[#151E32] border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex bg-slate-900/60 rounded-xl p-1 mb-8">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María José Hernández"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Matrícula</label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                onBlur={() => setMatriculaTouched(true)}
                placeholder="Ej. UTOM2024TIID"
                className={`w-full bg-slate-800/60 border rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none transition-colors ${
                  matriculaError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                }`}
                required
              />
              {matriculaError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {matriculaError}
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Carrera</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    className="w-full appearance-none bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="" disabled>
                      Selecciona tu carrera
                    </option>
                    {careers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.nombre@utom.edu.mx"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 mt-2"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;
