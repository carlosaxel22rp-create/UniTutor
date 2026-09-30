-- Pruebas de public.create_checkout (ejecutar después de 01_rls_tests.sql)
truncate t.results;
do $$
declare
  s  uuid := '11111111-1111-1111-1111-111111111111';
  tu uuid := '22222222-2222-2222-2222-222222222222';
  o  uuid := '33333333-3333-3333-3333-333333333333';
  subj int := (select id from public.subjects where slug = 'genetics');
  -- próximo lunes 09:00 hora CDMX (el tutor tiene disponibilidad Lun 08–10)
  mon timestamptz := ((date_trunc('week', now() at time zone 'America/Mexico_City') + interval '7 days 9 hours')
                      at time zone 'America/Mexico_City');
  k uuid := gen_random_uuid();
  r record; r2 record; e text; n int;
begin
  select * into r from public.create_checkout(s, tu, subj, array[mon], k);
  perform t.ok('Checkout: crea pago + 1 reserva con precio de BD (12000)', r.amount_cents = 12000 and cardinality(r.booking_ids) = 1);
  perform t.ok('Checkout: comisión 15 % congelada en la reserva',
    (select platform_fee_cents = 1800 and tutor_payout_cents = 10200 from public.bookings where id = r.booking_ids[1]));

  select * into r2 from public.create_checkout(s, tu, subj, array[mon], k);
  perform t.ok('Checkout: mismo Idempotency-Key devuelve el mismo pago', r2.payment_id = r.payment_id);

  e := t.try('service_role', null, format($q$select * from public.create_checkout(%L, %L, %s, array[%L::timestamptz], gen_random_uuid())$q$, o, tu, subj, mon));
  perform t.ok('Checkout: slot ya tomado → 23P01 y rollback', e like '%no_overlap%', e);
  perform t.ok('Checkout: rollback no dejó pago huérfano',
    (select count(*) from public.payments where student_id = o) = 0);

  e := t.try('service_role', null, format($q$select * from public.create_checkout(%L, %L, %s, array[%L::timestamptz], gen_random_uuid())$q$, o, tu, subj, mon + interval '5 hours'));
  perform t.ok('Checkout: fuera de disponibilidad rechazado', e like '%no está disponible%', e);

  e := t.try('service_role', null, format($q$select * from public.create_checkout(%L, %L, %s, array[%L::timestamptz], gen_random_uuid())$q$, o, tu, subj, mon + interval '1 hour 30 minutes'));
  perform t.ok('Checkout: horario que no inicia en punto rechazado', e like '%en punto%', e);

  e := t.try('service_role', null, format($q$select * from public.create_checkout(%L, %L, %s, array[%L::timestamptz, %L::timestamptz], gen_random_uuid())$q$, o, tu, subj, mon + interval '1 hour', mon + interval '1 hour'));
  perform t.ok('Checkout: horarios duplicados rechazados', e like '%duplicados%', e);

  e := t.try('service_role', null, format($q$select * from public.create_checkout(%L, %L, %s, array[date_trunc('hour', now()) + interval '1 hour'], gen_random_uuid())$q$, o, tu, subj));
  perform t.ok('Checkout: menos de 2 h de anticipación rechazado', e like '%ventana%', e);

  e := t.try('authenticated', s, format($q$select * from public.create_checkout(%L, %L, %s, array[%L::timestamptz], gen_random_uuid())$q$, s, tu, subj, mon + interval '1 hour'));
  perform t.ok('Checkout: cliente NO puede invocar la RPC', e like '%permission denied%', e);
end $$;
select case when ok then 'PASS' else 'FAIL' end as result, label, detail from t.results order by ok, label;

-- CI: falla con código ≠ 0 si alguna prueba no pasó
do $$
begin
  if exists (select 1 from t.results where not ok) then
    raise exception 'Pruebas de seguridad fallidas: %', (select string_agg(label, '; ') from t.results where not ok);
  end if;
end $$;
