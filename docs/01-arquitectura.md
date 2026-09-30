# EduConnect — Módulo 1: Arquitectura e Infraestructura

> Plataforma P2P de tutorías universitarias para la comunidad `@utom.edu.mx`.
> Diseño visual de referencia: prototipo Figma Make (marca provisional *"Aprendeo"*, tema glassmorphism oscuro, acento naranja `#F97316`, azul `#1E3A8A → #2D55C8`, tipografías Outfit + Inter).

---

## 0. Lo que el diseño Figma exige al backend

El prototipo define el recorrido principal y, con él, qué datos y endpoints necesita la plataforma:

| Pantalla / componente en Figma | Qué implica técnicamente |
|---|---|
| **Nav**: buscador global, campana de notificaciones con punto naranja, avatar + "2nd year · IT" | Búsqueda full-text (tutores, materias, carreras); tabla `notifications` + Supabase Realtime; perfil con `career` y `semester` |
| **Hero**: "418 tutors available this week" + buscador | Contador agregado (vista materializada/cache); endpoint de búsqueda con rate limit |
| **Browse by Career** (IT, Gastronomy, Biotechnology, Marketing) con conteo de tutores | Tabla `careers` (jerarquía Carrera → Materia) |
| **Subjects in {career}** con emoji y "N tutors available" | Tabla `subjects` con `icon`, conteo de `tutor_subjects` aprobados |
| **TutorCard**: foto, nombre abreviado "Camila R.", carrera · semestre, ⭐ 4.9 (38), **$12/hr**, badge *"Passed with Excellence"* / *"Honor Roll"*, chips de materias, botón **Book Session** | `profiles` (display_name, avatar, hourly_rate, rating agregado); `tutor_subjects` con **calificación verificada** por un admin → badge derivado, nunca autodeclarado |
| **SchedulingWidget**: rejilla Lun–Vie × 8:00–17:00, selección múltiple de slots | `tutor_availability` (semanal recurrente) + `bookings` con **restricción anti-doble-reserva** |
| **Student Reviews** en el widget | Tabla `reviews` (solo tras sesión completada, 1 por reserva) |
| **"Pay & Schedule (N slots)"** | Un **checkout** = 1 cobro Stripe que agrupa N reservas; retención de fondos hasta que cada sesión termine |
| Footer: Privacy / Terms / Help | Aviso de privacidad (LFPDPPP México), términos del marketplace |

---

## 1. Diagrama de arquitectura del sistema

```
                                   ┌──────────────────────────────────────────┐
                                   │              USUARIOS                    │
                                   │  Alumno  ·  Tutor (alumno verificado)    │
                                   │  Admin (coordinación académica)          │
                                   └───────────────┬──────────────────────────┘
                                                   │ HTTPS (TLS 1.3, HSTS)
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  EDGE  ·  Vercel Edge Network / WAF  (DDoS L3/L4, TLS termination, bot protection)     │
└───────────────┬─────────────────────────────────────────────────────┬───────────────────┘
                │                                                     │
                ▼                                                     ▼
┌───────────────────────────────────────┐          ┌──────────────────────────────────────────┐
│  FRONTEND  ·  Next.js 15 (App Router) │          │  API  ·  Node.js 22 + Express (TS)       │
│  Vercel                               │  Bearer  │  Render (Web Service, región us-east/ohio)│
│  ─ Server Components (lectura)        │  JWT     │  Arquitectura limpia por módulos:        │
│  ─ Middleware: sesión Supabase (SSR)  ├─────────►│   auth · bookings · payments · video ·   │
│  ─ CSP con nonce, headers seguros     │          │   reviews · admin · webhooks             │
│  ─ Tailwind v4 (tokens del Figma)     │          │  ─ helmet, CORS allowlist, zod           │
│  ─ Solo ANON KEY en el navegador      │          │  ─ rate limit (Redis)                    │
└──────┬───────────────────────┬────────┘          │  ─ SERVICE ROLE KEY (solo servidor)      │
       │ supabase-js           │ Realtime (WSS)    └───┬──────────┬──────────┬────────────────┘
       │ (anon key + JWT       │ notificaciones        │          │          │
       │  del usuario → RLS)   │                       │          │          │
       ▼                       ▼                       ▼          │          │
┌───────────────────────────────────────────────────────────┐    │          │
│  SUPABASE (proyecto dedicado, región us-east-1)           │    │          │
│  ┌─────────────┐  ┌──────────────────────────────────┐    │    │          │
│  │ Auth(GoTrue)│  │ PostgreSQL 15+                   │    │    │          │
│  │ ─ bcrypt    │  │ ─ RLS en TODAS las tablas         │◄───┘    │          │
│  │ ─ JWT 1h +  │  │ ─ esquema private (helpers       │          │          │
│  │   refresh   │  │   SECURITY DEFINER)              │          │          │
│  │ ─ hook de   │  │ ─ exclusion constraint anti      │          │          │
│  │   dominio   │  │   doble-reserva (btree_gist)     │          │          │
│  │ ─ CAPTCHA   │  │ ─ pg_cron: expirar holds,        │          │          │
│  │ ─ MFA admin │  │   liberar pagos                  │          │          │
│  └─────────────┘  └──────────────────────────────────┘          │          │
│  ┌──────────────────────────┐ ┌───────────────────────┐          │          │
│  │ Storage (privado)        │ │ Realtime              │          │          │
│  │ avatars (público-lectura)│ │ canal notifications   │          │          │
│  │ tutor-evidence (kárdex)  │ │ filtrado por RLS      │          │          │
│  └──────────────────────────┘ └───────────────────────┘          │          │
└───────────────────────────────────────────────────────────┘      │          │
                                                                   ▼          ▼
                                   ┌──────────────────────────────┐  ┌──────────────────────────┐
                                   │  STRIPE (Connect)            │  │  DAILY.CO                │
                                   │  ─ Plataforma MX, cuentas    │  │  ─ Salas privadas por    │
                                   │    Express para tutores      │  │    reserva (exp = fin)   │
                                   │  ─ Separate charges &        │  │  ─ Meeting tokens        │
                                   │    transfers (escrow)        │  │    efímeros (exp, nbf)   │
                                   │  ─ Payment Element / 3DS     │  │  ─ Webhooks:             │
                                   │  ─ Webhooks firmados ───────►│  │    meeting.ended,        │
                                   │    /webhooks/stripe          │  │    participant.joined    │
                                   └──────────────────────────────┘  └──────────────────────────┘

   Servicios de soporte:  Upstash Redis (rate limit)  ·  Sentry (errores, sin PII)  ·
                          Resend/SMTP propio (correos Auth)  ·  GitHub Actions (CI + escaneo)
```

### 1.1 Responsabilidad de cada capa

| Capa | Responsabilidad | Qué **no** hace |
|---|---|---|
| **Next.js (Vercel)** | Render de UI del Figma, lectura de catálogo/tutores/reseñas directo de Supabase con el JWT del usuario (RLS filtra), sesión SSR con cookies `HttpOnly; Secure; SameSite=Lax`. | Nunca conoce la `service_role`, ni claves secretas de Stripe/Daily. No escribe en `bookings`, `payments` ni `users`. |
| **API Express (Render)** | Toda operación con **dinero, estado o terceros**: checkout, cancelaciones, tokens de video, webhooks, acciones de admin, onboarding Stripe del tutor. Valida JWT de Supabase, rol y ownership. | No sirve UI. No guarda datos de tarjeta. |
| **Supabase Postgres** | Fuente de verdad. Integridad por constraints (dominio, precios > 0, no traslapes), RLS como **segunda línea de defensa** aunque el API falle. | Sin lógica de pago. |
| **Supabase Auth** | Registro/login, hash **bcrypt** de contraseñas, verificación de correo, rotación de refresh tokens, CAPTCHA, MFA (TOTP) obligatorio para admins. | — |
| **Stripe Connect** | Cobro (PCI-DSS nivel 1 delegado), retención en balance de plataforma, transferencias a tutores, reembolsos, disputas, KYC de tutores. | — |
| **Daily.co** | Aula virtual; salas privadas que expiran; tokens por participante. | — |

### 1.2 Decisiones clave (ADR resumidos)

1. **Backend = Node.js + Express (TypeScript)** en lugar de FastAPI: mismo lenguaje que el frontend, tipos compartidos (`packages/shared`), SDKs oficiales de Stripe/Daily/Supabase de primer nivel.
2. **Lecturas directas a Supabase, escrituras sensibles vía API.** El cliente puede leer catálogo y sus propios datos (RLS). Crear reservas, pagar, cancelar o emitir tokens de video solo pasa por el API con `service_role` y validaciones de negocio. La RLS niega esas escrituras al rol `authenticated` aunque alguien use la anon key directamente.
3. **Modelo de pago: "Separate charges and transfers"** (no `capture_method=manual`). Una autorización manual caduca a los ~7 días; una reserva puede ser para dentro de 2–3 semanas. Con cargos y transferencias separadas el dinero queda en el balance de la plataforma (escrow) y se transfiere a cada tutor **por sesión completada**, usando `source_transaction` para ligar la transferencia al cobro. Encaja con el botón del Figma "Pay & Schedule (N slots)": **1 cobro → N reservas → N transferencias**.
4. **Rol en tabla + claim en JWT.** El rol vive en `public.users.role` (solo modificable por admin/servicio). Un *Custom Access Token Hook* lo copia al JWT (`user_role`) para la UI; las políticas RLS críticas consultan la tabla (fuente fresca) para que una degradación de rol surta efecto inmediato, no hasta que caduque el token.
5. **Badge académico verificado.** "Passed with Excellence" / "Honor Roll" se **derivan** de la calificación que un admin verificó contra el kárdex subido a un bucket privado. Un tutor no puede auto-asignarse badge ni calificación.
6. **Moneda MXN en centavos (`integer`)**. Nunca `float` para dinero. (El Figma muestra `$12/hr`; se asume MXN — ajustar si la operación será en USD.)

---

## 2. Flujo de datos completo: Alumno → Plataforma → Stripe → Tutor → Aula Virtual

### 2.1 Máquina de estados de una reserva

```
                    checkout creado (hold 15 min)
                              │
                              ▼
   ┌────────────────── pending_payment ──────────────────┐
   │ hold expira (pg_cron)     │ payment_intent.succeeded │ payment_failed
   ▼                           ▼                          ▼
 expired                   confirmed ─────────────► cancelled ──► refunded
                               │  cancelación ≥24h antes        (100 %)
                               │  (alumno o tutor)
                               │
                  start_at - 10 min: se habilita el aula
                               │
                               ▼
                          in_progress   (participant.joined)
                               │
                  meeting.ended / end_at
                               │
                               ▼
                           completed ──── ventana de disputa 24 h ────► payout_released
                               │                                        (Stripe Transfer)
                               └── reporte / no-show ──► disputed ──► admin decide:
                                                                        refunded | payout_released
```

### 2.2 Secuencia paso a paso

```
Alumno (Next.js)         API Express              Supabase DB           Stripe                Tutor              Daily.co
     │                        │                        │                    │                    │                   │
 ①   │─ login/registro ──────────────────────────────►│ Auth: dominio      │                    │                   │
     │  (email @utom.edu.mx + CAPTCHA)                 │ @utom.edu.mx?      │                    │                   │
     │◄──────────── JWT (1h) + refresh (rotativo) ─────│ hook añade rol     │                    │                   │
     │                        │                        │                    │                    │                   │
 ②   │─ Browse Career → Subject → Tutores ───────────►│ SELECT con RLS     │                    │                   │
     │  (supabase-js, anon key + JWT)                  │ (vista tutor_cards)│                    │                   │
     │                        │                        │                    │                    │                   │
 ③   │─ POST /v1/checkout ───►│ authN + rol + zod      │                    │                    │                   │
     │  {tutorId, subjectId,  │ rate-limit 10/min      │                    │                    │                   │
     │   slots:[ISO...]}      │─ BEGIN ───────────────►│ INSERT bookings    │                    │                   │
     │  + Idempotency-Key     │  precio = tarifa del   │ status=pending_    │                    │                   │
     │                        │  tutor (servidor,      │ payment; EXCLUDE   │                    │                   │
     │                        │  nunca del cliente)    │ impide traslapes   │                    │                   │
     │                        │─ PaymentIntent ──────────────────────────► │ amount = Σ slots   │                   │
     │                        │  transfer_group=pay_id │                    │ + metadata          │                   │
     │                        │─ INSERT payments ─────►│                    │                    │                   │
     │◄─ client_secret ───────│                        │                    │                    │                   │
     │                        │                        │                    │                    │                   │
 ④   │─ Payment Element (iframe de Stripe; la tarjeta nunca toca nuestros servidores) ─►│ 3DS / SCA          │                   │
     │                        │                        │                    │                    │                   │
 ⑤   │                        │◄── webhook payment_intent.succeeded (firma verificada) ─│                    │                   │
     │                        │─ idempotencia (stripe_events) ────────────►│                    │                    │                   │
     │                        │─ UPDATE bookings → confirmed ─────────────►│                    │                    │                   │
     │                        │─ POST /rooms (privada, exp = end_at+15m) ─────────────────────────────────────────────────────►│
     │                        │─ INSERT notifications ─►│── Realtime ──────────────────────────► 🔔 "Nueva sesión"│                   │
     │◄───────────── Realtime 🔔 "Sesión confirmada" ──│                    │                    │                   │
     │                        │                        │                    │                    │                   │
 ⑥   │─ POST /v1/bookings/:id/join ─►│ ¿participante? ¿ventana [start-10m, end]?               │                   │
     │                        │─ POST /meeting-tokens (room, user_id, exp=end_at, eject_at_token_exp) ───────────────────────►│
     │◄─ token efímero ───────│  (no se persiste)      │                    │                    │── mismo flujo ───►│
     │═════════════════════════════ videollamada WebRTC cifrada (DTLS-SRTP) ════════════════════════════════════════════════│
     │                        │                        │                    │                    │                   │
 ⑦   │                        │◄── webhook meeting.ended / participant.joined (HMAC verificado) ────────────────────────────│
     │                        │─ UPDATE → completed (+ evidencia de asistencia) ─►│             │                    │                   │
     │                        │─ DELETE room ───────────────────────────────────────────────────────────────────────────────►│
     │                        │                        │                    │                    │                   │
 ⑧   │─ reseña ⭐ (INSERT directo; RLS exige booking completed + autor = alumno) ─►│ trigger recalcula rating         │
     │                        │                        │                    │                    │                   │
 ⑨   │                        │  pg_cron / job: completed + 24h sin disputa │                    │                   │
     │                        │─ Transfer(amount − comisión, destination=acct_tutor, source_transaction=ch_…) ─►│      │
     │                        │─ UPDATE → payout_released ───────────────►│                    │── payout a su ────►│
     │                        │                        │                    │                    │   banco (CLABE)   │
```

### 2.3 Flujos secundarios

| Flujo | Descripción | Control de seguridad |
|---|---|---|
| **Onboarding de tutor** | Alumno solicita ser tutor → sube kárdex/constancia (PDF) a `tutor-evidence/{uid}/…` → admin revisa, registra calificación por materia → `tutor_subjects.status = approved` → rol `tutor` → Stripe Connect Express onboarding (Account Link) para KYC y CLABE. | Bucket privado, URLs firmadas de 60 s para el admin; KYC delegado a Stripe; cambio de rol solo por admin con MFA + `audit_logs`. |
| **Cancelación** | ≥ 24 h antes: reembolso 100 %. < 24 h: política configurable (p. ej. 50 %). Tutor cancela: siempre 100 % al alumno. | Solo vía API; el importe se recalcula en servidor; `refunds.create` con idempotency key. |
| **No-show** | Si el tutor no se une (`participant.joined` ausente) → `disputed` automático → reembolso. Si el alumno no se une → se libera pago al tutor. | Evidencia de asistencia proviene de webhooks firmados, no del cliente. |
| **Disputa (chargeback)** | `charge.dispute.created` → congela transferencias pendientes del `transfer_group`; si ya se transfirió, `transfers.createReversal`. | Webhook idempotente; alerta al admin. |
| **Notificaciones (🔔 del Figma)** | Inserciones hechas por el API → Supabase Realtime entrega al usuario. | Realtime respeta RLS: cada quien solo recibe sus filas. |

---

## 3. Controles de seguridad por capa (mapa OWASP Top 10 2021)

| OWASP | Riesgo en EduConnect | Mitigación diseñada |
|---|---|---|
| **A01 Broken Access Control** | Alumno ve reservas ajenas; tutor se sube el rating; alumno se vuelve admin. | RLS en todas las tablas + `REVOKE` por defecto + `GRANT` por columna; rol solo modificable por servicio; middleware `requireRole`; verificación de ownership en cada endpoint (anti-IDOR). |
| **A02 Cryptographic Failures** | Robo de contraseñas o datos en tránsito. | TLS 1.3 + HSTS preload; bcrypt en Supabase Auth; AES-256 en reposo (Supabase/AWS); secretos solo en variables de entorno del servidor; cero PAN/CVV almacenado. |
| **A03 Injection** | SQLi en búsqueda; XSS en bio/reseñas. | Supabase client / consultas parametrizadas; búsqueda con `websearch_to_tsquery`; `zod` + límites de longitud; sanitización con DOMPurify en servidor para texto enriquecido; React escapa por defecto; CSP con nonce. |
| **A04 Insecure Design** | Doble reserva; precio manipulado desde el cliente. | Exclusion constraint en BD; precio calculado en servidor; máquina de estados; idempotency keys. |
| **A05 Security Misconfiguration** | Service role expuesta; CORS abierto. | `service_role` solo en Render; CORS allowlist; `helmet`; esquemas `private` no expuestos por PostgREST. |
| **A07 Identification & Auth Failures** | Fuerza bruta en login; cuentas de correos externos. | Rate limits de Supabase Auth + CAPTCHA (Turnstile); trigger de dominio `@utom.edu.mx`; confirmación de correo obligatoria; MFA para admins; política de contraseñas ≥ 12 caracteres + HIBP. |
| **A08 Software & Data Integrity** | Webhooks falsificados. | Firma Stripe (`constructEvent`) y HMAC de Daily; tabla `stripe_events` para idempotencia; `npm audit`/Dependabot; lockfile. |
| **A09 Logging & Monitoring** | Ataques sin rastro. | `audit_logs` (append-only), logs estructurados sin PII (pino + redact), alertas Sentry. |
| **A10 SSRF** | URLs de avatar arbitrarias. | Avatares solo vía Supabase Storage; no se descargan URLs de usuario desde el servidor. |

> CSRF: el API usa `Authorization: Bearer <JWT>` (no cookies), por lo que no es susceptible a CSRF clásico. Las Server Actions de Next.js validan `Origin`, y las cookies de sesión SSR son `SameSite=Lax`.

---

## 4. Entornos e infraestructura

| Entorno | Frontend | API | Supabase | Stripe | Daily |
|---|---|---|---|---|---|
| `local` | `next dev` | `tsx watch` | Supabase CLI (Docker) | modo test + `stripe listen` | dominio de pruebas |
| `staging` | Vercel Preview | Render (branch `develop`) | proyecto `educonnect-staging` | modo test | dominio staging |
| `production` | Vercel Prod | Render (branch `main`, 2 instancias) | proyecto `educonnect-prod` (PITR activo) | modo live | dominio prod |

- Migraciones versionadas en `supabase/migrations/` aplicadas por CI (`supabase db push`) — nunca cambios manuales en el dashboard de producción.
- Backups: Point-in-Time Recovery en producción; prueba de restauración trimestral.
- Región: todos los servicios en la misma región de EE. UU. este para minimizar latencia desde México y cumplir con transferencia de datos declarada en el aviso de privacidad.

---

## 5. Plan incremental (Scrum)

| Sprint (2 sem) | Incremento entregable |
|---|---|
| 1 | Infra + Auth con dominio institucional, esquema BD + RLS (este módulo), CI. |
| 2 | Catálogo Carrera → Materia → Tutores (pantallas del Figma), búsqueda. |
| 3 | Onboarding de tutor, verificación de kárdex, badges, disponibilidad. |
| 4 | Checkout Stripe, webhooks, estados de reserva, notificaciones. |
| 5 | Aula virtual Daily.co, asistencia, reseñas. |
| 6 | Liberación de pagos, cancelaciones/disputas, panel admin, pentest y hardening. |
