# EduConnect — Módulo 4: Plan de Pruebas de Seguridad y Despliegue

## 1. Plan de pruebas de seguridad

### 1.1 Automatizadas (CI — `.github/workflows/ci-security.yml`)

Se ejecutan en cada PR; si alguna falla, no se puede hacer merge a `main` (protección de rama).

| Job | Qué valida | Herramienta | Estado local |
|---|---|---|---|
| `database-rls` | 64 casos: dominio, RBAC, RLS, anti-IDOR, anti doble-reserva, checkout atómico | PostgreSQL 16 + SQL | 64/64 ✓ |
| `api` | 42 casos: JWT forjado/expirado, rol desde BD, MFA, XSS, prototype pollution, mass-assignment, rate limit, CSRF, CORS, firmas de webhooks, política de reembolso | vitest + supertest | 42/42 ✓ |
| `web` | Typecheck, build y **búsqueda de secretos en el bundle** del navegador | tsc, next build, grep | ✓ |
| `secrets-scan` | Claves commiteadas en todo el historial | gitleaks | — |
| `sast` | Reglas OWASP Top 10, Node, React, TypeScript | Semgrep | — |
| dependencias | Vulnerabilidades altas/críticas en dependencias de producción | `npm audit` + Dependabot | 0 vulnerabilidades |
| `dast-staging` | Escaneo pasivo semanal de la app desplegada | OWASP ZAP baseline | — |

### 1.2 Pruebas manuales antes de cada release mayor (checklist de pentest)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Registrarse con `@gmail.com`, `@utom.edu.mx.evil.com`, `@alumnos.utom.edu.mx` | Rechazado por Auth |
| 2 | `signUp({ data: { role: 'admin' } })` desde la consola del navegador | La cuenta nace `student` |
| 3 | Con la anon key: `update users set role='admin'` / `insert into bookings` / `update profiles set rating_avg=5` | *permission denied* |
| 4 | Cambiar el `id` en `/aula/<uuid>` y en `POST /v1/bookings/<uuid>/video-token` con una reserva ajena | 404 en ambos |
| 5 | Enviar `price_cents`, `status` o `amount` en el body del checkout | 400 |
| 6 | Dos checkouts simultáneos del mismo slot (2 pestañas) | Uno 201, otro 409 `slot_taken` |
| 7 | Reenviar un webhook de Stripe capturado (replay) o alterar su cuerpo | 400 / duplicado ignorado |
| 8 | Pedir un token de video 1 h antes o después de la sesión | 409 `too_early` / `session_over` |
| 9 | Entrar a la URL de la sala Daily sin token | Daily rechaza (sala privada) |
| 10 | 20 intentos de login fallidos seguidos | Bloqueo por rate limit de Auth + CAPTCHA |
| 11 | XSS en bio y reseña: `<img src=x onerror=alert(1)>`, `javascript:` | Se guarda como texto plano; la CSP bloquearía cualquier script inyectado |
| 12 | Admin sin MFA intenta aprobar un kárdex | 403 `mfa_required` |
| 13 | Admin intenta aprobar su propia solicitud de tutor | 403 (segregación de funciones) |
| 14 | Suspender a un usuario con sesión abierta | Su siguiente petición: 403; la RLS devuelve 0 filas |
| 15 | Pago con tarjeta de prueba 3DS `4000 0027 6000 3184` y con disputa `4000 0000 0000 0259` | 3DS completado · payouts congelados + transferencia revertida |
| 16 | Revisar el bundle (`.next/static`) buscando claves | Sin `sk_`, `whsec_`, `service_role` |
| 17 | securityheaders.com y SSL Labs contra producción | A+ / A+ |

## 2. Checklist previo al despliegue a producción

### Supabase
- [ ] Proyecto de **producción separado** del de staging; región us-east-1.
- [ ] Migraciones aplicadas por CI (`supabase db push`), **no** a mano en el dashboard.
- [ ] Consulta de control: todas las tablas con `relrowsecurity = true` (12/12).
- [ ] Security Advisor y Performance Advisor del dashboard sin alertas.
- [ ] *Custom Access Token Hook* activado → `public.custom_access_token_hook`.
- [ ] *Confirm email* activado; **Leaked password protection** activado; longitud mínima 12.
- [ ] Bot & Abuse Protection: Turnstile con secret key configurada.
- [ ] Rate limits de Auth revisados (sign-ups, sign-ins, OTP, correos por hora).
- [ ] MFA TOTP habilitado; todas las cuentas admin enroladas.
- [ ] SMTP propio (dominio `utom.edu.mx` o subdominio) con SPF, DKIM y DMARC.
- [ ] Site URL y Redirect URLs solo con el dominio de producción (sin comodines).
- [ ] Exposed schemas: solo `public`.
- [ ] SSL enforcement activado; Network Restrictions limitadas a las IPs de salida de Render.
- [ ] Point-in-Time Recovery activado; prueba de restauración documentada.
- [ ] Rotada la `service_role` si alguna vez se usó en local con datos reales.
- [ ] Extensiones `btree_gist`, `pg_trgm` y `pg_cron` activas; job `expire-booking-holds` corriendo.

### Render (API)
- [ ] `NODE_ENV=production`; el arranque falla si falta un secreto, si la clave de Stripe es de prueba o si falta `REDIS_URL`.
- [ ] Secretos en el Env Group `educonnect-secrets` (nunca en `render.yaml` ni en el repo).
- [ ] Redis (Key Value) sin acceso público (`ipAllowList: []`).
- [ ] Dominio `api.<dominio>` con TLS administrado; HTTP → HTTPS.
- [ ] `CORS_ORIGINS` = solo el dominio de producción del frontend.
- [ ] Health check `/health` configurado; 2 instancias; auto-deploy solo desde `main`.
- [ ] Cron `educonnect-payouts` cada 15 min con alertas si falla.
- [ ] Logs revisados: sin tokens, correos, `client_secret` ni firmas (redacción de pino).

### Vercel (Web)
- [ ] Solo variables `NEXT_PUBLIC_*` públicas; ninguna clave secreta en el proyecto de Vercel.
- [ ] Dominio de producción con HTTPS; HSTS preload enviado a hstspreload.org tras 1 semana estable.
- [ ] Deployment Protection en Previews (evita que se indexen o expongan ramas).
- [ ] Headers verificados en producción: CSP con nonce, HSTS, `X-Frame-Options`, `Permissions-Policy`.
- [ ] Firewall/WAF de Vercel activado con reglas de rate limit para `/login` y `/registro`.

### Stripe
- [ ] Modo **live** activado solo tras completar la verificación de la plataforma (MX).
- [ ] Connect: branding, términos del marketplace y país MX configurados; cuentas **Express**.
- [ ] Restricted key (`rk_live_…`) con permisos mínimos en lugar de la secret key completa.
- [ ] Dos endpoints de webhook (plataforma y Connect) con **solo** los eventos usados: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `account.updated`.
- [ ] Radar activado; regla para bloquear pagos si falla 3DS.
- [ ] 2FA obligatorio para todo el equipo con acceso al dashboard.

### Daily.co
- [ ] Salas creadas solo por el API (`privacy: private`); desactivar la creación de salas desde el dashboard para el equipo.
- [ ] Webhook registrado con HMAC para `participant.joined` y `meeting.ended`.
- [ ] Grabación deshabilitada a nivel dominio (sin datos biométricos almacenados).
- [ ] API key rotada y guardada solo en Render.

### Legal y datos personales (México)
- [ ] **Aviso de privacidad** conforme a la ley de protección de datos personales en posesión de particulares (LFPDPPP) vigente, con finalidades, transferencias (Stripe, Daily, Supabase, Vercel, Render en EE. UU.) y medios para derechos ARCO. Revisarlo con asesoría legal: la regulación mexicana se reformó en 2025.
- [ ] Términos del marketplace: política de cancelación (24 h), comisión del 15 %, resolución de disputas y conducta.
- [ ] Consentimiento explícito al registrarse (casilla ya implementada; `users.terms_accepted_at`).
- [ ] Política de retención: borrar notificaciones con más de 12 meses y anonimizar reseñas de cuentas eliminadas.

### Operación
- [ ] Sentry (web y API) con `beforeSend` que elimine PII.
- [ ] Alertas: 5xx > 1 %, webhooks fallidos, 429 anómalos, payouts fallidos.
- [ ] Runbook de incidentes: rotación de claves, suspensión masiva, aviso a usuarios.
- [ ] Pentest externo o revisión por pares antes de abrir a toda la universidad.

## 3. Variables de entorno

Plantillas completas y comentadas:

- `apps/api/.env.example`: secretos del servidor (Supabase service role, Stripe, Daily, Redis).
- `apps/web/.env.example`: **solo valores públicos** (`NEXT_PUBLIC_*`).

| Variable | Dónde vive | Secreta | Nota |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Render | **Sí, crítica** | Omite RLS |
| `STRIPE_SECRET_KEY` | Render | **Sí** | Preferir `rk_live_` |
| `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET` | Render | Sí | Uno por endpoint |
| `DAILY_API_KEY` / `DAILY_WEBHOOK_HMAC` | Render | Sí | — |
| `REDIS_URL` | Render | Sí | `rediss://` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel | No | Protegida por RLS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel | No | `pk_live_` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel | No | La secret key va en Supabase |

**Rotación:** cada 90 días, o de inmediato si alguien sale del equipo o un secreto aparece en logs o en git (gitleaks lo detecta).
