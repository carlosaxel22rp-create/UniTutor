-- =============================================================================
-- EduConnect · Migración 0006 · Checkout atómico + cancelaciones tardías
--
-- public.create_checkout() crea en UNA transacción el registro de pago y
-- las N reservas del botón "Pay & Schedule (N slots)". Si cualquier slot
-- choca con otra reserva (EXCLUDE), falla todo y no queda nada a medias.
-- Solo la puede ejecutar el backend (service_role).
-- =============================================================================

alter table public.bookings
  add column late_cancellation boolean not null default false;

comment on column public.bookings.late_cancellation is
  'Cancelada por el alumno con < 24 h de anticipación: sin reembolso, se paga al tutor.';

create index bookings_late_cancel_idx on public.bookings (end_at)
  where status = 'cancelled' and late_cancellation;

create or replace function public.create_checkout(
  p_student          uuid,
  p_tutor            uuid,
  p_subject          integer,
  p_slots            timestamptz[],
  p_idempotency_key  uuid,
  p_fee_bps          integer default 1500,
  p_hold_minutes     integer default 15
)
returns table (payment_id uuid, amount_cents integer, hold_expires_at timestamptz, booking_ids uuid[])
language plpgsql
set search_path = ''
as $$
declare
  v_rate       integer;
  v_tz         text;
  v_fee        integer;
  v_payment    uuid;
  v_hold       timestamptz := now() + make_interval(mins => p_hold_minutes);
  v_slot       timestamptz;
  v_local      timestamp;
  v_ids        uuid[] := '{}';
  v_id         uuid;
begin
  -- Idempotencia: el mismo Idempotency-Key devuelve el mismo checkout
  select p.id into v_payment from public.payments p
   where p.idempotency_key = p_idempotency_key and p.student_id = p_student;
  if found then
    return query
      select p.id, p.amount_cents, min(b.hold_expires_at), array_agg(b.id order by b.start_at)
        from public.payments p join public.bookings b on b.payment_id = p.id
       where p.id = v_payment
       group by p.id;
    return;
  end if;

  -- Validaciones de entrada
  if p_slots is null or cardinality(p_slots) not between 1 and 10 then
    raise exception 'Selecciona entre 1 y 10 horarios' using errcode = 'check_violation';
  end if;
  if (select count(distinct s) from unnest(p_slots) s) <> cardinality(p_slots) then
    raise exception 'Horarios duplicados' using errcode = 'check_violation';
  end if;
  if p_fee_bps not between 0 and 5000 then
    raise exception 'Comisión inválida' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.users where id = p_student and status = 'active') then
    raise exception 'Alumno no activo' using errcode = 'check_violation';
  end if;
  if not private.is_listed_tutor(p_tutor) then
    raise exception 'Tutor no disponible' using errcode = 'check_violation';
  end if;

  -- El precio SIEMPRE sale de la BD, nunca del cliente
  select pr.hourly_rate_cents, pr.timezone into v_rate, v_tz
    from public.profiles pr where pr.id = p_tutor;
  if v_rate is null then
    raise exception 'El tutor no tiene tarifa configurada' using errcode = 'check_violation';
  end if;
  v_fee := round(v_rate::numeric * p_fee_bps / 10000);

  foreach v_slot in array p_slots loop
    if v_slot <> date_trunc('hour', v_slot) then
      raise exception 'Los horarios deben iniciar en punto' using errcode = 'check_violation';
    end if;
    if v_slot < now() + interval '2 hours' or v_slot > now() + interval '60 days' then
      raise exception 'Horario fuera de la ventana permitida (2 h a 60 días)' using errcode = 'check_violation';
    end if;
    v_local := v_slot at time zone v_tz;
    if not exists (
      select 1 from public.tutor_availability a
       where a.tutor_id   = p_tutor
         and a.weekday    = extract(isodow from v_local)::smallint
         and a.start_time <= v_local::time
         and a.end_time   >= (v_local + interval '1 hour')::time
    ) then
      raise exception 'El tutor no está disponible en %', to_char(v_local, 'Dy DD/MM HH24:MI')
        using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.payments (student_id, idempotency_key, amount_cents)
  values (p_student, p_idempotency_key, v_rate * cardinality(p_slots))
  returning id into v_payment;

  foreach v_slot in array p_slots loop
    -- bookings_tutor_no_overlap / bookings_student_no_overlap lanzan 23P01
    -- si el slot ya está tomado → rollback de TODO el checkout.
    insert into public.bookings (student_id, tutor_id, subject_id, payment_id, status,
                                 start_at, end_at, hold_expires_at, price_cents, platform_fee_cents)
    values (p_student, p_tutor, p_subject, v_payment, 'pending_payment',
            v_slot, v_slot + interval '1 hour', v_hold, v_rate, v_fee)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  return query select v_payment, v_rate * cardinality(p_slots), v_hold, v_ids;
end $$;

revoke execute on function public.create_checkout(uuid, uuid, integer, timestamptz[], uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_checkout(uuid, uuid, integer, timestamptz[], uuid, integer, integer)
  to service_role;
