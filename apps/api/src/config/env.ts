import { z } from 'zod'

/**
 * Validación de variables de entorno al arrancar (fail-fast).
 * Si falta un secreto o tiene formato inválido, el proceso NO inicia.
 * Nunca se imprime el valor de un secreto, solo el nombre de la variable.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Orígenes permitidos por CORS (coma-separados). Ej: https://educonnect.utom.edu.mx
  CORS_ORIGINS: z.string().min(1).transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  APP_URL: z.url(),

  // Supabase
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Solo si el proyecto aún firma JWT con el secreto HS256 legado.
  // Con claves asimétricas (recomendado) se usa el JWKS y esto queda vacío.
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(5000).default(1500), // 15 %
  CURRENCY: z.literal('mxn').default('mxn'),

  // Daily.co
  DAILY_API_KEY: z.string().min(20),
  DAILY_DOMAIN: z.string().regex(/^[a-z0-9-]+$/), // <subdominio>.daily.co
  DAILY_WEBHOOK_HMAC: z.string().min(20), // base64

  // Redis (rate limit distribuido). Opcional en local → store en memoria.
  REDIS_URL: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const vars = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    // eslint-disable-next-line no-console
    console.error(`[config] Variables de entorno inválidas o faltantes: ${vars}`)
    process.exit(1)
  }
  const env = parsed.data
  if (env.NODE_ENV === 'production') {
    if (env.STRIPE_SECRET_KEY.includes('_test_')) throw new Error('Clave de Stripe de prueba en producción')
    if (!env.REDIS_URL) throw new Error('REDIS_URL es obligatorio en producción (rate limit distribuido)')
  }
  return env
}

export const env: Env = process.env.NODE_ENV === 'test' ? (process.env as unknown as Env) : loadEnv()
