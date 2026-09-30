-- =============================================================================
-- EduConnect · Migración 0005 · Tareas programadas
-- La liberación de pagos (Stripe Transfer) la ejecuta el API, no la BD,
-- porque requiere la clave secreta de Stripe. Aquí solo se expiran holds.
-- =============================================================================

-- Libera slots cuyo hold de 15 min venció sin pago. Al pasar a 'expired'
-- la reserva sale del EXCLUDE constraint y el horario vuelve a estar libre.
create or replace function private.expire_booking_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
     set status = 'expired'
   where status = 'pending_payment'
     and hold_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function private.expire_booking_holds() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('expire-booking-holds', '* * * * *',
                          'select private.expire_booking_holds()');
  end if;
end $$;
