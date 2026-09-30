# EduConnect — Módulo 3: Estructura del Proyecto y Código Base

Estado verificado: **API** typecheck ✓ · 42/42 pruebas (vitest) ✓ · build ✓ — **Web** typecheck ✓ · `next build` ✓ — **BD** 64/64 pruebas SQL ✓.

## 1. Estructura del monorepo

```
UniTutor/
├── apps/
│   ├── api/                              # Node 22 + Express 5 + TypeScript (Render)
│   │   ├── src/
│   │   │   ├── config/env.ts             # validación zod de variables (fail-fast)
│   │   │   ├── lib/                      # clientes externos (una sola instancia)
│   │   │   │   ├── supabase.ts           # service_role (solo servidor)
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── daily.ts              # REST Daily + verificación HMAC de webhooks
│   │   │   │   ├── redis.ts · logger.ts · errors.ts
│   │   │   ├── middleware/               # ◀ controles transversales de seguridad
│   │   │   │   ├── authenticate.ts       # JWT (JWKS) + rol/estado frescos de BD
│   │   │   │   ├── require-role.ts       # RBAC + MFA (aal2)
│   │   │   │   ├── rate-limit.ts         # Redis, por IP o por usuario
│   │   │   │   ├── sanitize.ts           # XSS, control chars, prototype pollution
│   │   │   │   ├── validate.ts           # zod estricto (anti mass-assignment)
│   │   │   │   ├── transport.ts          # HTTPS, JSON-only (CSRF), no-store
│   │   │   │   └── error-handler.ts      # sin fugas de stack/SQL
│   │   │   ├── modules/                  # un módulo por caso de uso (arquitectura limpia)
│   │   │   │   ├── checkout/             # schema · service · routes
│   │   │   │   ├── payments/             # webhooks Stripe · escrow · payouts · disputas
│   │   │   │   ├── video/                # salas y tokens Daily · webhook de asistencia
│   │   │   │   ├── bookings/             # cancelación + política de reembolso
│   │   │   │   ├── tutors/               # onboarding Stripe Connect Express
│   │   │   │   ├── admin/                # aprobación de kárdex (admin + MFA + auditoría)
│   │   │   │   └── shared.ts             # notify(), audit(), tipos
│   │   │   ├── jobs/release-payouts.ts   # Render Cron cada 15 min
│   │   │   ├── app.ts                    # composición y orden de middlewares
│   │   │   └── server.ts                 # arranque, timeouts, apagado limpio
│   │   ├── test/                         # vitest + supertest
│   │   └── .env.example
│   └── web/                              # Next.js 16 App Router + Tailwind v4 (Vercel)
│       ├── src/
│       │   ├── proxy.ts                  # CSP con nonce + sesión Supabase + rutas privadas
│       │   ├── app/
│       │   │   ├── layout.tsx · globals.css   # tokens del Figma (glass, naranja, Outfit/Inter)
│       │   │   ├── (auth)/registro/      # Server Action + Turnstile + dominio institucional
│       │   │   └── (app)/
│       │   │       ├── explorar/         # Carrera → Materia → TutorCards (RLS)
│       │   │       └── aula/[bookingId]/ # aula virtual Daily
│       │   ├── components/
│       │   │   ├── catalog/              # TutorCard, TutorGrid
│       │   │   ├── checkout/             # SchedulingWidget + Stripe Payment Element
│       │   │   ├── video/VideoRoom.tsx
│       │   │   └── layout/NotificationBell.tsx   # Realtime
│       │   └── lib/                      # supabase (server/client), api, validation
│       ├── next.config.ts                # HSTS, X-Frame-Options, Permissions-Policy
│       └── .env.example
├── supabase/
│   ├── migrations/                       # 0001…0006 (esquema, RLS, catálogo, storage, jobs, checkout)
│   └── tests/                            # 64 pruebas de seguridad de BD
├── .github/workflows/ci-security.yml     # CI: tests, RLS, gitleaks, semgrep, ZAP
├── render.yaml                           # API + cron + Redis
└── docs/                                 # Módulos 1–4
```

> La plantilla Vite original (`src/`, `index.html`, `vite.config.js` en la raíz) ya no se usa; puedes eliminarla cuando confirmes.

## 2. Pipeline de una petición al API

```
Request ─► requireHttps ─► helmet ─► CORS allowlist ─► request-id + log (redactado)
   │
   ├─ /webhooks/*  ─► express.raw ─► firma (Stripe / Daily HMAC) ─► idempotencia ─► handler
   │
   └─ /v1/*  ─► json(20kb) ─► rate limit global (IP) ─► JSON-only ─► sanitize
                 ─► authenticate (JWT + BD) ─► requireRole ─► limiter por ruta (usuario)
                 ─► validate(zod estricto) ─► handler (ownership) ─► errorHandler
```

## 3. Middlewares clave

### 3.1 Autenticación y roles — `authenticate.ts`, `require-role.ts`

- Solo `Authorization: Bearer <JWT>`; sin cookies → el API no es vulnerable a CSRF.
- Firma verificada localmente con el **JWKS** de Supabase (ES256/RS256), más `iss`, `aud=authenticated` y `exp`. Hay un modo HS256 opcional para proyectos con el secreto legado.
- El **rol y el estado se leen de la BD** en cada petición: un claim `user_role: admin` inyectado en el token se ignora (prueba incluida), y una suspensión aplica al instante.
- `requireRole('admin')` + `requireMfa` exige sesión `aal2` (TOTP) para todo el panel de admin.
- Los errores no revelan la causa ("Sesión inválida o expirada").

### 3.2 Rate limiting y sanitización — `rate-limit.ts`, `sanitize.ts`, `validate.ts`

| Limitador | Ventana | Límite | Clave |
|---|---|---|---|
| global | 15 min | 300 | IP (IPv6 /56) |
| auth (pre-login) | 1 min | 5 | IP |
| checkout | 1 min | 10 | usuario |
| payments (cancelar/onboarding) | 1 h | 20 | usuario |
| video-token | 1 min | 20 | usuario |
| admin | 1 min | 60 | usuario |

- Store en **Redis** compartido entre instancias; `passOnStoreError: false`, de modo que si Redis cae, las rutas de dinero se bloquean en lugar de quedar sin límite.
- **Login y registro** van directo a Supabase Auth: se protegen con sus rate limits nativos + Cloudflare Turnstile + HIBP.
- `sanitize.ts` quita todo HTML, entidades codificadas, caracteres de control y bidi (*Trojan Source*), y rechaza `__proto__`, `constructor`, claves `$` o con punto, anidamiento > 6 y > 200 campos.
- `validate.ts` usa `z.strictObject`: un `price_cents` o `status` enviado por el cliente devuelve 400 (anti mass-assignment).

### 3.3 Pagos diferidos con Stripe Connect — `checkout/`, `payments/`

1. **`POST /v1/checkout`** (`Idempotency-Key` obligatorio) → la RPC SQL `create_checkout` crea el pago y las N reservas **en una transacción**. El precio sale del perfil del tutor y se valida la disponibilidad; el `EXCLUDE` impide la doble reserva. Luego se crea el PaymentIntent en la **cuenta de plataforma**, con `transfer_group = payment_id`.
2. El navegador confirma con el **Payment Element** (iframe de Stripe, 3-D Secure). La tarjeta nunca toca nuestros servidores: PCI SAQ-A.
3. El webhook **`payment_intent.succeeded`** (firmado e idempotente) cruza monto y moneda con la BD y confirma las reservas. Si un hold expiró y otro alumno tomó el slot, **reembolsa esa parte automáticamente**. Después crea las salas Daily y notifica.
4. El **job de payouts** paga al tutor 24 h después de `completed` (o si el alumno canceló tarde): `transfers.create` con `source_transaction` e `idempotencyKey: payout-<booking>`.
5. **Cancelaciones**: tutor → 100 %; alumno con ≥ 24 h → 100 %; alumno con < 24 h → 0 %, y el tutor cobra. **Disputas**: se congelan los payouts y se revierten las transferencias.

### 3.4 Videollamadas con tokens temporales — `video/`

- Sala **privada** por reserva (`ec-<uuid>`), `max_participants: 2`, `nbf = inicio − 10 min`, `exp = fin + 15 min`, `eject_at_room_exp`, sin grabación.
- **`POST /v1/bookings/:id/video-token`**: solo alumno o tutor de esa reserva (otros reciben 404, sin revelar que existe), solo en estado confirmado y dentro de la ventana horaria. El token dura hasta el fin + 5 min, con `eject_at_token_exp`, `Cache-Control: no-store`, y **nunca se persiste**.
- **Webhook Daily** (HMAC-SHA256 + ventana anti-replay de 5 min): `participant.joined` registra la asistencia y `meeting.ended` cierra la sesión. Si faltó el tutor, la sesión pasa a `disputed`. Luego se elimina la sala.

## 4. Frontend: controles de seguridad

| Control | Dónde |
|---|---|
| CSP estricta con **nonce por petición** + `strict-dynamic`; orígenes explícitos para Stripe, Turnstile, Supabase y Daily | `src/proxy.ts` |
| Sesión validada con `getClaims()` (firma verificada), cookies `HttpOnly; Secure; SameSite=Lax` | `proxy.ts`, `lib/supabase/server.ts` |
| HSTS preload, `X-Frame-Options: DENY`, `Permissions-Policy` (cámara/micrófono solo para Daily) | `next.config.ts` |
| Registro: dominio `@utom.edu.mx`, contraseña ≥ 12 (máx. 72, límite de bcrypt), Turnstile, respuesta genérica anti-enumeración, el rol nunca se envía | `(auth)/registro` |
| Sin `dangerouslySetInnerHTML`; todo texto escapado por React | todo el proyecto |
| Fuentes auto-hospedadas (next/font) → `font-src 'self'` | `layout.tsx` |
| Imágenes solo del bucket `avatars` (anti-SSRF del optimizador) | `next.config.ts` |
| Idempotency-Key por intento de pago (doble clic ≠ doble cobro) | `CheckoutPanel.tsx` |

## 5. Cómo ejecutar en local

```bash
# BD
supabase start && supabase db reset          # aplica migrations/ + seed

# API
cd apps/api && cp .env.example .env && npm ci
stripe listen --forward-to localhost:4000/webhooks/stripe      # copia el whsec_ a .env
npm run dev

# Web
cd apps/web && cp .env.example .env.local && npm ci && npm run dev

# Pruebas
cd apps/api && npm test                       # 42 pruebas de middlewares
```
