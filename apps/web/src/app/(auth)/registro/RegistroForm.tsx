'use client'
import { useActionState } from 'react'
import { signUp, type SignUpState } from './actions'

const initial: SignUpState = { ok: false, message: '' }

/** Formulario de registro con el estilo glass del Figma. */
export function RegistroForm() {
  const [state, action, pending] = useActionState(signUp, initial)
  const err = (f: string) => state.fieldErrors?.[f]?.[0]

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-app">
      <form action={action} className="glass-strong w-full max-w-md rounded-2xl p-6 space-y-4" noValidate>
        <h1 className="font-display text-2xl font-bold text-white">Crea tu cuenta</h1>
        <p className="text-sm text-white/50">Solo para la comunidad @utom.edu.mx</p>

        <Field name="fullName" label="Nombre completo" autoComplete="name" error={err('fullName')} />
        <Field name="email" type="email" label="Correo institucional" autoComplete="email" placeholder="nombre@utom.edu.mx" error={err('email')} />
        <Field name="password" type="password" label="Contraseña (mín. 12)" autoComplete="new-password" error={err('password')} />

        <label className="flex gap-2 text-xs text-white/60">
          <input type="checkbox" name="acceptTerms" className="mt-0.5" />
          Acepto el aviso de privacidad y los términos del servicio
        </label>
        {err('acceptTerms') && <p className="text-xs text-red-300">{err('acceptTerms')}</p>}

        <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-theme="dark" />

        <button disabled={pending} className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50">
          {pending ? 'Creando cuenta…' : 'Registrarme'}
        </button>
        {state.message && (
          <p role="status" className={`text-sm ${state.ok ? 'text-emerald-300' : 'text-red-300'}`}>
            {state.message}
          </p>
        )}
      </form>
    </main>
  )
}

function Field(props: { name: string; label: string; type?: string; autoComplete?: string; placeholder?: string; error?: string | undefined }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-white/70">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? 'text'}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        aria-invalid={Boolean(props.error)}
        className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
        required
      />
      {props.error && <span className="text-xs text-red-300">{props.error}</span>}
    </label>
  )
}
