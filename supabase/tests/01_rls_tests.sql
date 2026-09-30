-- Pruebas de seguridad del esquema (dominio, RBAC, RLS, integridad).
-- Ejecutar sobre una BD con 00_supabase_stub.sql + migraciones aplicadas.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema if not exists t;
create table if not exists t.results (label text, ok boolean, detail text);
truncate t.results;

create or replace function t.as_user(p_role text, p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
  execute format('set local role %I', p_role);
end $$;

-- Ejecuta sql como (rol, uid). Devuelve null si ok, o el mensaje de error.
create or replace function t.try(p_role text, p_uid uuid, p_sql text) returns text language plpgsql as $$
begin
  perform t.as_user(p_role, p_uid);
  execute p_sql;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlerrm;
end $$;

create or replace function t.count_as(p_role text, p_uid uuid, p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform t.as_user(p_role, p_uid);
  execute 'select count(*) from (' || p_sql || ') q' into n;
  reset role;
  return n;
end $$;

create or replace function t.ok(p_label text, p_cond boolean, p_detail text default null) returns void language sql as $$
  insert into t.results values (p_label, p_cond, p_detail);
$$;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------
do $$
declare err text;
begin
  begin
    insert into auth.users (email) values ('hacker@gmail.com');
    perform t.ok('Dominio: rechaza @gmail.com', false);
  exception when others then
    perform t.ok('Dominio: rechaza @gmail.com', sqlerrm like '%utom.edu.mx%', sqlerrm);
  end;
  begin
    insert into auth.users (email) values ('evil@utom.edu.mx.attacker.com');
    perform t.ok('Dominio: rechaza sufijo falso utom.edu.mx.attacker.com', false);
  exception when others then
    perform t.ok('Dominio: rechaza sufijo falso utom.edu.mx.attacker.com', true);
  end;
  begin
    insert into auth.users (email) values ('x@alumnos.utom.edu.mx');
    perform t.ok('Dominio: rechaza subdominio no autorizado', false);
  exception when others then
    perform t.ok('Dominio: rechaza subdominio no autorizado', true);
  end;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'Maria.J@UTOM.edu.mx', '{"full_name":"María Jiménez","role":"admin"}'),
  ('22222222-2222-2222-2222-222222222222', 'camila.r@utom.edu.mx', '{"full_name":"Camila Rodríguez"}'),
  ('33333333-3333-3333-3333-333333333333', 'otro@utom.edu.mx',     '{"full_name":"Otro Alumno"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@utom.edu.mx',    '{"full_name":"Admin Coord"}');

select t.ok('Alta: users + profiles creados por trigger', (select count(*) from public.users) = 4
        and (select count(*) from public.profiles) = 4);
select t.ok('Alta: rol inyectado en metadata es ignorado (nace student)',
        (select role from public.users where id = '11111111-1111-1111-1111-111111111111') = 'student');
select t.ok('Alta: email normalizado a minúsculas',
        (select email from public.users where id = '11111111-1111-1111-1111-111111111111') = 'maria.j@utom.edu.mx');
select t.ok('Alta: display_name estilo Figma "Camila R."',
        (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 'Camila R.',
        (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'));

-- Configuración como backend (service_role): tutor aprobado + admin
update public.users set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';
update public.users set role = 'tutor', payouts_enabled = true, stripe_account_id = 'acct_123ABC'
 where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set hourly_rate_cents = 12000, semester = 7,
       career_id = (select id from public.careers where slug = 'biotech')
 where id = '22222222-2222-2222-2222-222222222222';
insert into public.tutor_subjects (tutor_id, subject_id, status, final_grade, verified_by, verified_at)
select '22222222-2222-2222-2222-222222222222', id, 'approved', 9.7, '44444444-4444-4444-4444-444444444444', now()
  from public.subjects where slug in ('cell-biology', 'genetics');

do $$
begin
  begin
    insert into public.tutor_subjects (tutor_id, subject_id, status, final_grade)
    select '22222222-2222-2222-2222-222222222222', id, 'approved', 9.9 from public.subjects where slug = 'biochemistry';
    perform t.ok('Integridad: aprobado sin verificador es rechazado', false);
  exception when check_violation then
    perform t.ok('Integridad: aprobado sin verificador es rechazado', true);
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Pruebas como ALUMNO (María = 1111…)
-- ---------------------------------------------------------------------------
do $$
declare
  s  uuid := '11111111-1111-1111-1111-111111111111';
  tu uuid := '22222222-2222-2222-2222-222222222222';
  o  uuid := '33333333-3333-3333-3333-333333333333';
  a  uuid := '44444444-4444-4444-4444-444444444444';
  e text;
  subj int := (select id from public.subjects where slug = 'genetics');
  bk uuid;
begin
  perform t.ok('RLS users: alumno solo ve su propia fila',
    t.count_as('authenticated', s, 'select * from public.users') = 1);

  e := t.try('authenticated', s, $q$update public.users set role = 'admin' where id = auth.uid()$q$);
  perform t.ok('RBAC: alumno NO puede auto-asignarse admin', e like '%permission denied%', e);

  e := t.try('authenticated', tu, $q$update public.profiles set rating_avg = 5 where id = auth.uid()$q$);
  perform t.ok('Integridad: tutor NO puede inflar su rating', e like '%permission denied%', e);

  e := t.try('authenticated', s, $q$update public.profiles set bio = 'Hola' where id = auth.uid()$q$);
  perform t.ok('Perfil: alumno puede editar su bio', e is null, e);

  e := t.try('authenticated', s, $q$update public.profiles set hourly_rate_cents = 9000 where id = auth.uid()$q$);
  perform t.ok('Perfil: alumno NO puede fijar tarifa de tutor', e like '%row-level security%', e);

  perform t.ok('Perfil: alumno NO puede editar perfil ajeno (0 filas)',
    t.count_as('authenticated', s, $q$select 1 from public.profiles where id = '33333333-3333-3333-3333-333333333333'$q$) = 0);

  perform t.ok('Catálogo: tutor_cards muestra a Camila con badge de excelencia',
    t.count_as('authenticated', s, $q$select 1 from public.tutor_cards where badge = 'passed_with_excellence' and display_name = 'Camila R.'$q$) = 1);

  perform t.ok('Catálogo: conteo de tutores por materia (genetics = 1)',
    t.count_as('authenticated', s, $q$select 1 from public.subject_tutor_counts where slug = 'genetics' and tutor_count = 1$q$) = 1);

  e := t.try('authenticated', s, $q$select final_grade from public.tutor_subjects$q$);
  perform t.ok('Privacidad: calificación exacta del kárdex no es legible por clientes', e like '%permission denied%', e);

  e := t.try('authenticated', s, format($q$insert into public.bookings (student_id, tutor_id, subject_id, start_at, end_at, price_cents, platform_fee_cents, hold_expires_at)
           values (%L, %L, %s, now() + interval '2 days', now() + interval '2 days 1 hour', 1, 0, now())$q$, s, tu, subj));
  perform t.ok('Pagos/estado: cliente NO puede crear reservas directo', e like '%permission denied%', e);

  e := t.try('authenticated', s, $q$select * from public.stripe_events$q$);
  perform t.ok('Webhooks: stripe_events inaccesible a clientes', e like '%permission denied%', e);

  e := t.try('anon', null, $q$select * from public.profiles$q$);
  perform t.ok('Anon: no puede leer perfiles', e like '%permission denied%', e);
  perform t.ok('Anon: sí puede ver catálogo de carreras',
    t.count_as('anon', null, 'select * from public.careers') = 4);

  -- ---- Backend crea reserva (service_role) ----
  perform t.as_user('service_role', null);
  insert into public.payments (student_id, idempotency_key, amount_cents)
       values (s, gen_random_uuid(), 12000);
  insert into public.bookings (student_id, tutor_id, subject_id, payment_id, start_at, end_at,
                               price_cents, platform_fee_cents, hold_expires_at, status)
       values (s, tu, subj, (select id from public.payments limit 1),
               date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour',
               12000, 1800, now() + interval '15 minutes', 'confirmed')
    returning id into bk;
  reset role;

  e := t.try('service_role', null, format($q$insert into public.bookings (student_id, tutor_id, subject_id, start_at, end_at, price_cents, platform_fee_cents, hold_expires_at)
           values (%L, %L, %s, date_trunc('hour', now()) + interval '2 days 30 minutes', date_trunc('hour', now()) + interval '2 days 90 minutes', 12000, 1800, now() + interval '15 minutes')$q$, o, tu, subj));
  perform t.ok('Anti doble-reserva: slot traslapado del tutor rechazado', e like '%bookings_tutor_no_overlap%', e);

  e := t.try('service_role', null, format($q$insert into public.bookings (student_id, tutor_id, subject_id, start_at, end_at, price_cents, platform_fee_cents, hold_expires_at)
           values (%L, %L, %s, now() + interval '3 days', now() + interval '3 days 1 hour', 12000, 1800, now())$q$,
           o, tu, (select id from public.subjects where slug = 'python')));
  perform t.ok('Integridad: no se reserva materia no aprobada para el tutor', e like '%no está aprobado%', e);

  e := t.try('service_role', null, format($q$insert into public.bookings (student_id, tutor_id, subject_id, start_at, end_at, price_cents, platform_fee_cents, hold_expires_at)
           values (%L, %L, %s, now() + interval '3 days', now() + interval '3 days 1 hour', 12000, 1800, now())$q$, tu, tu, subj));
  perform t.ok('Integridad: tutor no puede reservarse a sí mismo', e like '%bookings_not_self%', e);

  perform t.ok('RLS bookings: alumno ve su reserva',
    t.count_as('authenticated', s, 'select * from public.bookings') = 1);
  perform t.ok('RLS bookings: tutor ve su reserva',
    t.count_as('authenticated', tu, 'select * from public.bookings') = 1);
  perform t.ok('RLS bookings: tercero NO ve reservas ajenas (anti-IDOR)',
    t.count_as('authenticated', o, 'select * from public.bookings') = 0);
  perform t.ok('RLS bookings: admin ve todo',
    t.count_as('authenticated', a, 'select * from public.bookings') = 1);
  perform t.ok('RLS payments: tutor NO ve el cobro del alumno',
    t.count_as('authenticated', tu, 'select * from public.payments') = 0);
  perform t.ok('RLS profiles: tutor ve perfil de su alumno',
    t.count_as('authenticated', tu, format('select 1 from public.profiles where id = %L', s)) = 1);
  perform t.ok('RLS profiles: tercero NO ve perfil de un alumno ajeno',
    t.count_as('authenticated', o, format('select 1 from public.profiles where id = %L', s)) = 0);

  -- ---- Reseñas ----
  e := t.try('authenticated', s, format($q$insert into public.reviews (booking_id, rating, comment) values (%L, 5, 'Excelente')$q$, bk));
  perform t.ok('Reseña: rechazada si la sesión no está completada', e like '%completada%', e);

  update public.bookings set status = 'completed' where id = bk;

  e := t.try('authenticated', o, format($q$insert into public.reviews (booking_id, rating, comment) values (%L, 1, 'Spam')$q$, bk));
  perform t.ok('Reseña: tercero NO puede reseñar sesión ajena', e like '%row-level security%', e);

  e := t.try('authenticated', s, format($q$insert into public.reviews (booking_id, rating, comment) values (%L, 4, 'Muy clara')$q$, bk));
  perform t.ok('Reseña: alumno reseña su sesión completada', e is null, e);

  e := t.try('authenticated', s, format($q$insert into public.reviews (booking_id, rating, comment) values (%L, 5, 'Otra vez')$q$, bk));
  perform t.ok('Reseña: solo una por reserva', e like '%duplicate key%', e);

  perform t.ok('Rating: agregado recalculado por trigger (4.00, 1)',
    (select rating_avg = 4 and rating_count = 1 and sessions_completed = 1
       from public.profiles where id = tu));

  e := t.try('authenticated', s, $q$update public.reviews set is_hidden = true$q$);
  perform t.ok('Moderación: alumno NO puede ocultar reseñas (0 filas afectadas o denegado)',
    e is null and (select count(*) from public.reviews where is_hidden) = 0, e);

  -- ---- Notificaciones ----
  insert into public.notifications (user_id, type, title) values (s, 'booking_confirmed', 'Sesión confirmada');
  perform t.ok('Notificaciones: tercero no ve las ajenas',
    t.count_as('authenticated', o, 'select * from public.notifications') = 0);
  e := t.try('authenticated', s, $q$update public.notifications set title = 'x'$q$);
  perform t.ok('Notificaciones: solo read_at es editable', e like '%permission denied%', e);

  -- ---- Disponibilidad ----
  e := t.try('authenticated', s, format($q$insert into public.tutor_availability (tutor_id, weekday, start_time, end_time) values (%L, 1, '08:00', '10:00')$q$, s));
  perform t.ok('Disponibilidad: alumno NO publica horarios', e like '%row-level security%', e);
  e := t.try('authenticated', tu, format($q$insert into public.tutor_availability (tutor_id, weekday, start_time, end_time) values (%L, 1, '08:00', '10:00')$q$, tu));
  perform t.ok('Disponibilidad: tutor publica horario', e is null, e);
  e := t.try('authenticated', tu, format($q$insert into public.tutor_availability (tutor_id, weekday, start_time, end_time) values (%L, 1, '09:00', '11:00')$q$, tu));
  perform t.ok('Disponibilidad: bloques traslapados rechazados', e like '%availability_no_overlap%', e);

  -- ---- Solicitud de materia ----
  e := t.try('authenticated', o, format($q$insert into public.tutor_subjects (tutor_id, subject_id, evidence_path) values (%L, %s, %L)$q$,
             o, subj, o::text || '/kardex.pdf'));
  perform t.ok('Tutor onboarding: alumno solicita materia (pending)', e is null, e);
  e := t.try('authenticated', o, format($q$insert into public.tutor_subjects (tutor_id, subject_id, evidence_path) values (%L, %s, %L)$q$,
             s, subj, s::text || '/kardex.pdf'));
  perform t.ok('Tutor onboarding: no puede solicitar a nombre de otro', e like '%row-level security%', e);

  -- ---- Storage ----
  e := t.try('authenticated', o, format($q$insert into storage.objects (bucket_id, name) values ('tutor-evidence', %L)$q$, s::text || '/falso.pdf'));
  perform t.ok('Storage: no se sube evidencia a carpeta ajena', e like '%row-level security%', e);
  e := t.try('authenticated', o, format($q$insert into storage.objects (bucket_id, name) values ('tutor-evidence', %L)$q$, o::text || '/kardex.pdf'));
  perform t.ok('Storage: sube evidencia a carpeta propia', e is null, e);
  perform t.ok('Storage: otro usuario NO lee evidencia ajena',
    t.count_as('authenticated', s, $q$select * from storage.objects where bucket_id = 'tutor-evidence'$q$) = 0);
  perform t.ok('Storage: admin lee evidencia',
    t.count_as('authenticated', a, $q$select * from storage.objects where bucket_id = 'tutor-evidence'$q$) = 1);

  -- ---- Auditoría ----
  insert into public.audit_logs (actor_id, action, entity, entity_id) values (a, 'role.changed', 'users', tu::text);
  begin
    update public.audit_logs set action = 'borrado';
    perform t.ok('Auditoría: logs inmutables', false);
  exception when others then
    perform t.ok('Auditoría: logs inmutables', sqlerrm like '%append-only%');
  end;
  perform t.ok('Auditoría: alumno no lee logs',
    t.count_as('authenticated', s, 'select * from public.audit_logs') = 0);

  -- ---- Hook JWT ----
  perform t.ok('JWT hook: añade user_role=tutor',
    (public.custom_access_token_hook(jsonb_build_object('user_id', tu, 'claims', '{}'::jsonb))
       -> 'claims' ->> 'user_role') = 'tutor');
  e := t.try('authenticated', s, $q$select public.custom_access_token_hook('{}'::jsonb)$q$);
  perform t.ok('JWT hook: no invocable como RPC por clientes', e like '%permission denied%', e);

  -- ---- Suspensión ----
  update public.users set status = 'suspended' where id = s;
  perform t.ok('Cuenta suspendida: pierde acceso a sus reservas',
    t.count_as('authenticated', s, 'select * from public.bookings') = 0);
  update public.users set status = 'active' where id = s;

  -- ---- Expiración de holds ----
  perform t.as_user('service_role', null);
  insert into public.bookings (student_id, tutor_id, subject_id, start_at, end_at, price_cents, platform_fee_cents, hold_expires_at)
       values (o, tu, subj, now() + interval '5 days', now() + interval '5 days 1 hour', 12000, 1800, now() - interval '1 minute');
  reset role;
  perform t.ok('Holds: expire_booking_holds libera 1 slot vencido', private.expire_booking_holds() = 1);
end $$;

select case when ok then 'PASS' else 'FAIL' end as result, label, detail
  from t.results order by ok, label;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t.results;

-- CI: falla con código ≠ 0 si alguna prueba no pasó
do $$
begin
  if exists (select 1 from t.results where not ok) then
    raise exception 'Pruebas de seguridad fallidas: %', (select string_agg(label, '; ') from t.results where not ok);
  end if;
end $$;
