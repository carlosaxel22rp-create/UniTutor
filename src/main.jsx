import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root'))

const missingEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
  (key) => !import.meta.env[key]
)

if (missingEnv.length > 0) {
  // Sin credenciales, supabaseClient.js lanza un error al importarse y la app
  // queda en blanco. Mostramos instrucciones en lugar de una pantalla vacía.
  root.render(
    <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1>Falta configurar Supabase</h1>
      <p>
        No se encontraron estas variables de entorno: <strong>{missingEnv.join(', ')}</strong>.
      </p>
      <ol>
        <li>Copia <code>.env.example</code> a <code>.env</code> en la raíz del proyecto.</li>
        <li>
          Pega tu <code>VITE_SUPABASE_URL</code> y tu <code>VITE_SUPABASE_ANON_KEY</code> (Supabase Dashboard &gt;
          Project Settings &gt; API).
        </li>
        <li>Detén y vuelve a ejecutar <code>npm run dev</code>.</li>
      </ol>
    </div>
  )
} else {
  // Import dinámico: App (y supabaseClient) solo se cargan cuando ya hay credenciales.
  import('./App.jsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}
