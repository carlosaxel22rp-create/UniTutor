-- =============================================================================
-- EduConnect · Migración 0001 · Esquema base
-- PostgreSQL 15+ (Supabase)
--
-- Tablas requeridas : users, profiles, subjects, tutor_subjects, bookings,
--                     reviews, payments
-- Tablas de soporte : careers (Figma: "Browse by Career"),
--                     tutor_availability (Figma: rejilla Lun–Vie),
--                     notifications (Figma: campana), stripe_events,
--                     audit_logs
-- Convenciones      : dinero en centavos (integer), moneda MXN, timestamptz,
--                     UUID v4, snake_case.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm   with schema extensions;

-- Esquema NO expuesto por la API REST (PostgREST). Aquí viven los helpers
-- SECURITY DEFINER usados por RLS y triggers.
create schema if not exists private;
revoke all on schema private from public;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.user_role      as enum ('student', 'tutor', 'admin');
create type public.account_status as enum ('active', 'suspended', 'banned');

create type public.tutor_subject_status as enum ('pending', 'approved', 'rejected', 'revoked');

create type public.booking_status as enum (
  'pending_payment',   -- hold de 15 min mientras el alumno paga
  'expired',           -- hold vencido sin pago
  'confirmed',         -- pagado, sala creada
  'in_progress',       -- alguien entró al aula
  'completed',         -- sesión terminada
  'disputed',          -- reporte / no-show, requiere admin
  'cancelled',         -- cancelada (alumno/tutor/sistema)
  'refunded',          -- reembolso emitido
  'payout_released'    -- transferencia al tutor emitida
);

create type public.payment_status as enum (
  'requires_payment', 'processing', 'succeeded', 'failed',
  'partially_refunded', 'refunded', 'disputed'
);

create type public.notification_type as enum (
  'booking_confirmed', 'booking_cancelled', 'session_reminder',
  'review_published', 'tutor_approved', 'payout_released', 'system'
);

-- -----------------------------------------------------------------------------
-- Dominio institucional
-- -----------------------------------------------------------------------------
create or replace function private.is_institutional_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Solo el dominio exacto (sin subdominios ni sufijos tipo @utom.edu.mx.evil.com)
  select coalesce(lower(p_email) ~ '^[a-z0-9._%+\-]+@utom\.edu\.mx$', false);
$$;

-- =============================================================================
-- 1. USERS — identidad y seguridad (1:1 con auth.users)
--    Datos privados: solo el propio usuario y admins pueden leerlos.
-- =============================================================================
create table public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null unique,
  role                public.user_role      not null default 'student',
  status              public.account_status not null default 'active',
  -- Stripe: solo IDs opacos. NUNCA datos de tarjeta (PCI-DSS delegado).
  stripe_customer_id  text unique,
  stripe_account_id   text unique,          -- cuenta Connect Express del tutor
  payouts_enabled     boolean not null default false,
  terms_accepted_at   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint users_email_institutional check (private.is_institutional_email(email)),
  constraint users_email_lowercase     check (email = lower(email)),
  constraint users_stripe_customer_fmt check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  constraint users_stripe_account_fmt  check (stripe_account_id  is null or stripe_account_id  ~ '^acct_[A-Za-z0-9]+$')
);

-- =============================================================================
-- 2. CAREERS — "Browse by Career" (IT, Gastronomy, Biotechnology, Marketing)
-- =============================================================================
create table public.careers (
  id          smallint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null check (char_length(name) between 2 and 80),
  accent      text,                 -- token de color del Figma (p.ej. 'blue')
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 3. PROFILES — datos de presentación (TutorCard / avatar del nav)
-- =============================================================================
create table public.profiles (
  id                 uuid primary key references public.users (id) on delete cascade,
  full_name          text not null check (char_length(full_name) between 2 and 120),
  display_name       text not null check (char_length(display_name) between 2 and 40),  -- "Camila R."
  avatar_path        text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  career_id          smallint references public.careers (id),
  semester           smallint check (semester between 1 and 12),
  bio                text check (char_length(bio) <= 600),
  -- Solo aplica a tutores. Rango sano para evitar precios abusivos/errores.
  hourly_rate_cents  integer check (hourly_rate_cents is null or hourly_rate_cents between 5000 and 200000),
  timezone           text not null default 'America/Mexico_City',
  -- Agregados mantenidos por trigger (no editables por el usuario)
  rating_avg         numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count       integer      not null default 0 check (rating_count >= 0),
  sessions_completed integer      not null default 0 check (sessions_completed >= 0),
  search_vector      tsvector generated always as (
                       to_tsvector('spanish', coalesce(full_name,'') || ' ' || coalesce(bio,''))
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_career_idx on public.profiles (career_id);
create index profiles_search_idx on public.profiles using gin (search_vector);

-- =============================================================================
-- 4. SUBJECTS — "Subjects in {career}"
-- =============================================================================
create table public.subjects (
  id          integer generated always as identity primary key,
  career_id   smallint not null references public.careers (id) on delete restrict,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null check (char_length(name) between 2 and 100),
  icon        text check (char_length(icon) <= 16),   -- emoji del Figma
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index subjects_career_idx on public.subjects (career_id);
create index subjects_name_trgm  on public.subjects using gin (name extensions.gin_trgm_ops);

-- =============================================================================
-- 5. TUTOR_SUBJECTS — qué materias imparte cada tutor + evidencia académica
--    El badge ("Passed with Excellence" / "Honor Roll") se DERIVA de la
--    calificación verificada por un admin; el tutor no la puede editar.
-- =============================================================================
create table public.tutor_subjects (
  tutor_id        uuid     not null references public.users (id) on delete cascade,
  subject_id      integer  not null references public.subjects (id) on delete restrict,
  status          public.tutor_subject_status not null default 'pending',
  final_grade     numeric(4,2) check (final_grade between 0 and 10),  -- escala MX 0–10
  evidence_path   text,           -- objeto en bucket privado tutor-evidence
  verified_by     uuid references public.users (id),
  verified_at     timestamptz,
  rejection_note  text check (char_length(rejection_note) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (tutor_id, subject_id),

  badge text generated always as (
    case
      when status <> 'approved'  then null
      when final_grade >= 9.5    then 'passed_with_excellence'
      when final_grade >= 9.0    then 'honor_roll'
      else null
    end
  ) stored,

  -- Aprobado ⇒ debe tener verificación completa y calificación aprobatoria
  constraint tutor_subjects_approval_complete check (
    status <> 'approved'
    or (final_grade >= 8.0 and verified_by is not null and verified_at is not null)
  )
);

create index tutor_subjects_subject_idx on public.tutor_subjects (subject_id) where status = 'approved';

-- =============================================================================
-- 6. TUTOR_AVAILABILITY — disponibilidad semanal recurrente (rejilla del Figma)
-- =============================================================================
create table public.tutor_availability (
  id          bigint generated always as identity primary key,
  tutor_id    uuid not null references public.users (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- ISO: 1=Lun … 7=Dom
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint availability_range_valid check (end_time > start_time),
  constraint availability_on_the_hour check (
    extract(minute from start_time) = 0 and extract(minute from end_time) = 0
  ),
  -- Sin bloques traslapados para el mismo tutor y día
  constraint availability_no_overlap exclude using gist (
    tutor_id with =,
    weekday  with =,
    tsrange(('2000-01-01'::date + start_time), ('2000-01-01'::date + end_time)) with &&
  )
);

-- =============================================================================
-- 7. PAYMENTS — un checkout ("Pay & Schedule (N slots)") = 1 PaymentIntent
--    Separate charges & transfers: el dinero queda retenido en el balance de
--    la plataforma y se transfiere por sesión completada.
-- =============================================================================
create table public.payments (
  id                        uuid primary key default gen_random_uuid(),
  student_id                uuid not null references public.users (id) on delete restrict,
  stripe_payment_intent_id  text unique check (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  stripe_charge_id          text unique check (stripe_charge_id ~ '^(ch|py)_[A-Za-z0-9]+$'),
  idempotency_key           uuid not null unique,     -- enviado por el cliente
  amount_cents              integer not null check (amount_cents > 0),
  refunded_cents            integer not null default 0 check (refunded_cents >= 0),
  currency                  char(3) not null default 'mxn' check (currency = lower(currency)),
  status                    public.payment_status not null default 'requires_payment',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint payments_refund_le_amount check (refunded_cents <= amount_cents)
  -- Deliberadamente NO hay columnas de tarjeta (PAN, CVV, vencimiento).
);

create index payments_student_idx on public.payments (student_id, created_at desc);

-- =============================================================================
-- 8. BOOKINGS — una sesión de 1 h (un slot del Figma) entre alumno y tutor
-- =============================================================================
create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.users (id) on delete restrict,
  tutor_id              uuid not null references public.users (id) on delete restrict,
  subject_id            integer not null references public.subjects (id) on delete restrict,
  payment_id            uuid references public.payments (id) on delete restrict,
  status                public.booking_status not null default 'pending_payment',
  start_at              timestamptz not null,
  end_at                timestamptz not null,
  hold_expires_at       timestamptz,
  -- Importes congelados al momento de la reserva (el tutor puede cambiar tarifa después)
  price_cents           integer not null check (price_cents > 0),
  platform_fee_cents    integer not null check (platform_fee_cents >= 0),
  tutor_payout_cents    integer generated always as (price_cents - platform_fee_cents) stored,
  stripe_transfer_id    text unique check (stripe_transfer_id ~ '^tr_[A-Za-z0-9]+$'),
  -- Aula virtual: solo el nombre de la sala; los tokens NUNCA se persisten
  video_room_name       text unique check (video_room_name ~ '^[a-z0-9-]{8,64}$'),
  student_joined_at     timestamptz,
  tutor_joined_at       timestamptz,
  cancelled_by          uuid references public.users (id),
  cancellation_reason   text check (char_length(cancellation_reason) <= 500),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint bookings_not_self           check (student_id <> tutor_id),
  constraint bookings_time_valid         check (end_at > start_at),
  constraint bookings_duration           check (end_at - start_at between interval '30 minutes' and interval '3 hours'),
  constraint bookings_fee_le_price       check (platform_fee_cents <= price_cents),
  constraint bookings_hold_when_pending  check (status <> 'pending_payment' or hold_expires_at is not null),

  -- ANTI DOBLE-RESERVA a nivel de base de datos (A04 Insecure Design):
  -- un tutor no puede tener dos sesiones activas traslapadas…
  constraint bookings_tutor_no_overlap exclude using gist (
    tutor_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending_payment', 'confirmed', 'in_progress')),
  -- …ni un alumno estar en dos sesiones a la vez.
  constraint bookings_student_no_overlap exclude using gist (
    student_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending_payment', 'confirmed', 'in_progress'))
);

create index bookings_student_idx on public.bookings (student_id, start_at desc);
create index bookings_tutor_idx   on public.bookings (tutor_id, start_at desc);
create index bookings_payment_idx on public.bookings (payment_id);
create index bookings_hold_idx    on public.bookings (hold_expires_at) where status = 'pending_payment';
create index bookings_payout_idx  on public.bookings (end_at) where status = 'completed';

-- =============================================================================
-- 9. REVIEWS — "Student Reviews" (1 por reserva completada)
-- =============================================================================
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  student_id  uuid not null references public.users (id) on delete cascade,
  tutor_id    uuid not null references public.users (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) between 1 and 1000),
  is_hidden   boolean not null default false,          -- moderación admin
  created_at  timestamptz not null default now()
);

create index reviews_tutor_idx on public.reviews (tutor_id, created_at desc) where not is_hidden;

-- =============================================================================
-- 10. NOTIFICATIONS — campana del nav (Supabase Realtime)
-- =============================================================================
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null check (char_length(title) <= 120),
  body        text check (char_length(body) <= 500),
  booking_id  uuid references public.bookings (id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- =============================================================================
-- 11. STRIPE_EVENTS — idempotencia de webhooks (A08)
-- =============================================================================
create table public.stripe_events (
  id            text primary key check (id ~ '^evt_[A-Za-z0-9]+$'),
  type          text not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

-- =============================================================================
-- 12. AUDIT_LOGS — bitácora append-only (A09)
-- =============================================================================
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.users (id) on delete set null,
  action      text not null,          -- p.ej. 'role.changed', 'tutor_subject.approved'
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- =============================================================================
-- TRIGGERS Y FUNCIONES
-- =============================================================================

-- updated_at genérico -----------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_users_updated          before update on public.users          for each row execute function private.set_updated_at();
create trigger trg_profiles_updated       before update on public.profiles       for each row execute function private.set_updated_at();
create trigger trg_tutor_subjects_updated before update on public.tutor_subjects for each row execute function private.set_updated_at();
create trigger trg_payments_updated       before update on public.payments       for each row execute function private.set_updated_at();
create trigger trg_bookings_updated       before update on public.bookings       for each row execute function private.set_updated_at();

-- (A) Validación estricta de dominio en auth.users ------------------------------
--     Cubre registro por email, magic link y OAuth: si el correo no es
--     @utom.edu.mx, Supabase Auth recibe el error y NO crea la cuenta.
create or replace function private.enforce_institutional_domain()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_institutional_email(new.email) then
    raise exception 'Solo se permiten correos institucionales @utom.edu.mx'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_auth_users_domain
  before insert or update of email on auth.users
  for each row execute function private.enforce_institutional_domain();

-- (B) Alta automática de users + profiles al registrarse ------------------------
--     El rol SIEMPRE nace como 'student'; ignoramos cualquier rol que venga en
--     raw_user_meta_data (controlable por el cliente → escalamiento).
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                               split_part(new.email, '@', 1)), 120);
begin
  insert into public.users (id, email) values (new.id, lower(new.email));

  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    v_name,
    -- "Camila Rodríguez" → "Camila R." (como en la TutorCard)
    left(split_part(v_name, ' ', 1)
         || case when split_part(v_name, ' ', 2) <> ''
                 then ' ' || left(split_part(v_name, ' ', 2), 1) || '.'
                 else '' end, 40)
  );
  return new;
end $$;

create trigger trg_auth_users_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- (C) Sincroniza cambio de email confirmado -------------------------------------
create or replace function private.sync_auth_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.users set email = lower(new.email) where id = new.id;
  return new;
end $$;

create trigger trg_auth_users_email_sync
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_auth_email();

-- (D) Rating agregado del tutor (rating_avg / rating_count) ---------------------
create or replace function private.refresh_tutor_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_tutor uuid := coalesce(new.tutor_id, old.tutor_id);
begin
  update public.profiles p
     set rating_avg   = coalesce(s.avg, 0),
         rating_count = coalesce(s.cnt, 0)
    from (select round(avg(rating)::numeric, 2) as avg, count(*)::int as cnt
            from public.reviews
           where tutor_id = v_tutor and not is_hidden) s
   where p.id = v_tutor;
  return null;
end $$;

create trigger trg_reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function private.refresh_tutor_rating();

-- (E) Coherencia de la reseña con la reserva ------------------------------------
--     Copia student_id/tutor_id desde la reserva (no se confía en el cliente)
--     y exige que la sesión esté completada o liquidada.
create or replace function private.review_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  b record;
begin
  select student_id, tutor_id, status into b
    from public.bookings where id = new.booking_id;

  if not found or b.status not in ('completed', 'payout_released') then
    raise exception 'Solo se puede reseñar una sesión completada'
      using errcode = 'check_violation';
  end if;

  new.student_id := b.student_id;
  new.tutor_id   := b.tutor_id;
  return new;
end $$;

create trigger trg_reviews_integrity
  before insert on public.reviews
  for each row execute function private.review_integrity();

-- (F) La reserva solo puede ser con un tutor aprobado en esa materia ------------
create or replace function private.booking_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1
      from public.tutor_subjects ts
      join public.users u on u.id = ts.tutor_id
     where ts.tutor_id = new.tutor_id
       and ts.subject_id = new.subject_id
       and ts.status = 'approved'
       and u.role = 'tutor'
       and u.status = 'active'
  ) then
    raise exception 'El tutor no está aprobado para esta materia'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_bookings_integrity
  before insert on public.bookings
  for each row execute function private.booking_integrity();

-- (G) Contador de sesiones completadas ------------------------------------------
create or replace function private.count_completed_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.profiles set sessions_completed = sessions_completed + 1
     where id = new.tutor_id;
  end if;
  return null;
end $$;

create trigger trg_bookings_completed
  after update of status on public.bookings
  for each row execute function private.count_completed_session();

-- (H) audit_logs es append-only (ni siquiera service_role puede editar) ---------
create or replace function private.audit_logs_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs es append-only';
end $$;

create trigger trg_audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_immutable();

-- (I) Custom Access Token Hook: añade user_role al JWT --------------------------
--     Activar en Dashboard → Authentication → Hooks → Custom Access Token.
--     Úsese para la UI; la autorización crítica consulta la tabla (fuente fresca).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_role   public.user_role;
  v_status public.account_status;
begin
  select role, status into v_role, v_status
    from public.users where id = (event ->> 'user_id')::uuid;

  v_claims := jsonb_set(v_claims, '{user_role}',   to_jsonb(coalesce(v_role::text, 'student')));
  v_claims := jsonb_set(v_claims, '{user_status}', to_jsonb(coalesce(v_status::text, 'active')));
  return jsonb_set(event, '{claims}', v_claims);
end $$;

-- =============================================================================
-- HELPERS DE AUTORIZACIÓN (usados por RLS y vistas)
-- SECURITY DEFINER: leen public.users sin disparar su RLS (evita recursión).
-- Solo devuelven booleanos → no filtran datos. search_path vacío → sin
-- secuestro de funciones/tablas por objetos homónimos.
-- =============================================================================
create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users
                  where id = (select auth.uid()) and status = 'active');
$$;

create or replace function private.has_role(p_role public.user_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users
                  where id = (select auth.uid())
                    and role = p_role
                    and status = 'active');
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role('admin'::public.user_role);
$$;

create or replace function private.is_listed_tutor(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users
                  where id = p_user and role = 'tutor'
                    and status = 'active' and payouts_enabled);
$$;

-- ¿El usuario actual comparte (o compartió) una reserva con p_other?
create or replace function private.shares_booking_with(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
     where b.status <> 'expired'
       and ((b.student_id = (select auth.uid()) and b.tutor_id   = p_other)
         or (b.tutor_id   = (select auth.uid()) and b.student_id = p_other))
  );
$$;

-- =============================================================================
-- VISTA PÚBLICA PARA LA TUTORCARD DEL FIGMA
-- security_invoker = true → respeta la RLS de las tablas base.
-- Expone solo columnas de presentación (sin email, sin IDs de Stripe).
-- =============================================================================
create view public.tutor_cards
with (security_invoker = true) as
select
  p.id                                   as tutor_id,
  p.display_name,                        -- "Camila R."
  p.avatar_path,
  c.name                                 as career,          -- "Biotechnology"
  p.semester,                            -- 7 → "7th Semester"
  p.rating_avg,                          -- 4.9
  p.rating_count,                        -- (38)
  p.hourly_rate_cents,                   -- $12/hr
  p.sessions_completed,
  (select case
            when bool_or(ts.badge = 'passed_with_excellence') then 'passed_with_excellence'
            when bool_or(ts.badge = 'honor_roll')             then 'honor_roll'
          end
     from public.tutor_subjects ts
    where ts.tutor_id = p.id and ts.status = 'approved') as badge,
  array(select s.name from public.tutor_subjects ts
          join public.subjects s on s.id = ts.subject_id
         where ts.tutor_id = p.id and ts.status = 'approved'
         order by s.name)                as subjects,
  array(select ts.subject_id from public.tutor_subjects ts
         where ts.tutor_id = p.id and ts.status = 'approved') as subject_ids
from public.profiles p
left join public.careers c on c.id = p.career_id
-- public.users es privada por RLS; el filtro de rol/estado/Stripe se hace con
-- un helper SECURITY DEFINER que solo devuelve un booleano (definido en 0002).
where private.is_listed_tutor(p.id)
  and p.hourly_rate_cents is not null;

-- Conteo por materia ("N tutors available")
create view public.subject_tutor_counts
with (security_invoker = true) as
select s.id as subject_id, s.career_id, s.slug, s.name, s.icon,
       count(tc.tutor_id)::int as tutor_count
  from public.subjects s
  left join public.tutor_cards tc on s.id = any (tc.subject_ids)
 where s.is_active
 group by s.id;
