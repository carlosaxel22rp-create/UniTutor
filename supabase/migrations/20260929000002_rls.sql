-- =============================================================================
-- EduConnect · Migración 0002 · Privilegios + Row Level Security
--
-- Modelo: "deny by default".
--   1. Se revocan TODOS los privilegios que Supabase otorga por defecto a
--      anon/authenticated en el esquema public.
--   2. Se otorgan solo los privilegios necesarios (por tabla y por COLUMNA).
--   3. RLS habilitada en TODAS las tablas; las políticas deciden qué filas.
--   4. Escrituras de dinero/estado (bookings, payments, stripe_events,
--      users.role) no se otorgan a clientes: solo el API con service_role.
--
-- Roles de Postgres en Supabase:
--   anon          → visitante sin sesión
--   authenticated → cualquier usuario con JWT válido (alumno/tutor/admin)
--   service_role  → API backend (BYPASSRLS). Jamás en el navegador.
-- El rol de NEGOCIO (student/tutor/admin) se resuelve con private.has_role().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Deny by default
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public  from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Evita que tablas FUTURAS nazcan abiertas (Supabase concede por defecto)
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- El backend (service_role) opera todo; RLS no le aplica (BYPASSRLS)
grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Helpers de RLS: el esquema private NO está expuesto por PostgREST,
-- pero authenticated necesita ejecutarlos al evaluar políticas.
grant usage on schema private to authenticated, service_role;
grant execute on function
  private.is_active_user(),
  private.has_role(public.user_role),
  private.is_admin(),
  private.is_listed_tutor(uuid),
  private.shares_booking_with(uuid),
  private.is_institutional_email(text)
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Habilitar RLS en TODAS las tablas
-- -----------------------------------------------------------------------------
alter table public.users              enable row level security;
alter table public.profiles           enable row level security;
alter table public.careers            enable row level security;
alter table public.subjects           enable row level security;
alter table public.tutor_subjects     enable row level security;
alter table public.tutor_availability enable row level security;
alter table public.payments           enable row level security;
alter table public.bookings           enable row level security;
alter table public.reviews            enable row level security;
alter table public.notifications      enable row level security;
alter table public.stripe_events      enable row level security;
alter table public.audit_logs         enable row level security;

-- =============================================================================
-- USERS (privada: email, rol, IDs de Stripe)
-- =============================================================================
grant select on public.users to authenticated;
-- Sin INSERT/UPDATE/DELETE para clientes: el rol, estado y cuentas Stripe
-- solo cambian desde el API (service_role) con auditoría → anti escalamiento.

create policy users_select_self_or_admin on public.users
  for select to authenticated
  using ( id = (select auth.uid()) or (select private.is_admin()) );

-- Lectura para el Custom Access Token Hook
grant usage on schema public to supabase_auth_admin;
grant select (id, role, status) on public.users to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
create policy users_select_auth_hook on public.users
  for select to supabase_auth_admin
  using (true);

-- =============================================================================
-- PROFILES
-- =============================================================================
grant select on public.profiles to authenticated;
-- Solo columnas editables por el dueño. rating_*, sessions_completed y
-- search_vector quedan fuera → el tutor no puede inflar su calificación.
grant update (full_name, display_name, avatar_path, career_id, semester,
              bio, hourly_rate_cents, timezone)
  on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (select private.is_active_user()) and (
         id = (select auth.uid())                 -- mi perfil
      or private.is_listed_tutor(id)              -- TutorCards del catálogo
      or private.shares_booking_with(id)          -- mi contraparte en una sesión
      or (select private.is_admin())
    )
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using      ( id = (select auth.uid()) and (select private.is_active_user()) )
  with check (
    id = (select auth.uid())
    -- La tarifa solo la fija quien ya es tutor
    and (hourly_rate_cents is null or (select private.has_role('tutor')))
    -- El avatar debe estar en la carpeta propia del bucket
    and (avatar_path is null or avatar_path like (select auth.uid())::text || '/%')
  );

-- =============================================================================
-- CAREERS / SUBJECTS (catálogo)
-- =============================================================================
-- Visitantes ven el catálogo (landing: "Browse by Career").
grant select on public.careers, public.subjects to anon, authenticated;
grant insert (slug, name, accent, is_active)   on public.careers  to authenticated;
grant update (name, accent, is_active)         on public.careers  to authenticated;
grant insert (career_id, slug, name, icon, is_active) on public.subjects to authenticated;
grant update (name, icon, is_active)           on public.subjects to authenticated;

create policy careers_read_anon on public.careers
  for select to anon
  using ( is_active );
create policy careers_read_auth on public.careers
  for select to authenticated
  using ( is_active or (select private.is_admin()) );

create policy careers_admin_insert on public.careers
  for insert to authenticated with check ( (select private.is_admin()) );
create policy careers_admin_update on public.careers
  for update to authenticated
  using ( (select private.is_admin()) ) with check ( (select private.is_admin()) );

create policy subjects_read_anon on public.subjects
  for select to anon
  using ( is_active );
create policy subjects_read_auth on public.subjects
  for select to authenticated
  using ( is_active or (select private.is_admin()) );

create policy subjects_admin_insert on public.subjects
  for insert to authenticated with check ( (select private.is_admin()) );
create policy subjects_admin_update on public.subjects
  for update to authenticated
  using ( (select private.is_admin()) ) with check ( (select private.is_admin()) );

-- =============================================================================
-- TUTOR_SUBJECTS
-- Columnas sensibles (final_grade, evidence_path, rejection_note, verified_by)
-- NO se otorgan a clientes: solo se ve el badge derivado. El tutor consulta
-- su propio detalle y el admin verifica vía API (MFA + audit_logs).
-- =============================================================================
grant select (tutor_id, subject_id, status, badge, created_at, updated_at)
  on public.tutor_subjects to authenticated;
-- Solicitud para impartir una materia: solo se puede crear en 'pending'
grant insert (tutor_id, subject_id, evidence_path) on public.tutor_subjects to authenticated;

create policy tutor_subjects_select on public.tutor_subjects
  for select to authenticated
  using (
    (select private.is_active_user()) and (
         (status = 'approved' and private.is_listed_tutor(tutor_id))
      or tutor_id = (select auth.uid())
      or (select private.is_admin())
    )
  );

create policy tutor_subjects_request on public.tutor_subjects
  for insert to authenticated
  with check (
        tutor_id = (select auth.uid())
    and status = 'pending'
    and (select private.is_active_user())
    and evidence_path like (select auth.uid())::text || '/%'
  );

-- =============================================================================
-- TUTOR_AVAILABILITY (rejilla semanal)
-- =============================================================================
grant select on public.tutor_availability to authenticated;
grant insert (tutor_id, weekday, start_time, end_time) on public.tutor_availability to authenticated;
grant update (weekday, start_time, end_time)           on public.tutor_availability to authenticated;
grant delete on public.tutor_availability to authenticated;

create policy availability_select on public.tutor_availability
  for select to authenticated
  using (
    (select private.is_active_user())
    and (tutor_id = (select auth.uid()) or private.is_listed_tutor(tutor_id)
         or (select private.is_admin()))
  );

create policy availability_insert_own on public.tutor_availability
  for insert to authenticated
  with check ( tutor_id = (select auth.uid()) and (select private.has_role('tutor')) );

create policy availability_update_own on public.tutor_availability
  for update to authenticated
  using      ( tutor_id = (select auth.uid()) and (select private.has_role('tutor')) )
  with check ( tutor_id = (select auth.uid()) );

create policy availability_delete_own on public.tutor_availability
  for delete to authenticated
  using ( tutor_id = (select auth.uid()) and (select private.has_role('tutor')) );

-- =============================================================================
-- BOOKINGS — solo lectura para participantes. Escritura exclusiva del API.
-- =============================================================================
grant select on public.bookings to authenticated;

create policy bookings_select_participants on public.bookings
  for select to authenticated
  using (
    (select private.is_active_user()) and (
         student_id = (select auth.uid())
      or tutor_id   = (select auth.uid())
      or (select private.is_admin())
    )
  );
-- Sin políticas de INSERT/UPDATE/DELETE → denegado para authenticated.

-- =============================================================================
-- PAYMENTS — el alumno ve sus cobros; el tutor NO (ve su payout en bookings).
-- =============================================================================
grant select on public.payments to authenticated;

create policy payments_select_owner on public.payments
  for select to authenticated
  using ( student_id = (select auth.uid()) or (select private.is_admin()) );

-- =============================================================================
-- REVIEWS
-- =============================================================================
grant select on public.reviews to authenticated;
grant insert (booking_id, rating, comment) on public.reviews to authenticated;
grant update (is_hidden) on public.reviews to authenticated;   -- moderación (admin)

create policy reviews_select on public.reviews
  for select to authenticated
  using (
    (select private.is_active_user()) and (
         not is_hidden
      or student_id = (select auth.uid())
      or (select private.is_admin())
    )
  );

-- El trigger private.review_integrity() (BEFORE INSERT) copia student_id y
-- tutor_id desde la reserva y exige status completed. WITH CHECK se evalúa
-- DESPUÉS del trigger → si la reserva no es mía, student_id ≠ auth.uid() y
-- la inserción se rechaza.
create policy reviews_insert_own_completed on public.reviews
  for insert to authenticated
  with check (
        student_id = (select auth.uid())
    and (select private.is_active_user())
  );

create policy reviews_moderate_admin on public.reviews
  for update to authenticated
  using ( (select private.is_admin()) ) with check ( (select private.is_admin()) );

-- =============================================================================
-- NOTIFICATIONS — cada quien ve y marca como leídas solo las suyas.
-- Se crean desde el API (service_role).
-- =============================================================================
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using ( user_id = (select auth.uid()) );

create policy notifications_mark_read_own on public.notifications
  for update to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );

-- =============================================================================
-- STRIPE_EVENTS — solo backend. RLS habilitada y sin políticas = denegado.
-- =============================================================================

-- =============================================================================
-- AUDIT_LOGS — lectura para admins; escritura solo backend; inmutable (trigger)
-- =============================================================================
grant select on public.audit_logs to authenticated;

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using ( (select private.is_admin()) );

-- =============================================================================
-- VISTAS (security_invoker → heredan la RLS de las tablas base)
-- =============================================================================
grant select on public.tutor_cards          to authenticated;
grant select on public.subject_tutor_counts to authenticated;

-- =============================================================================
-- REALTIME — la campana del nav escucha INSERTs en notifications.
-- Realtime aplica la RLS de SELECT: cada usuario solo recibe sus filas.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
