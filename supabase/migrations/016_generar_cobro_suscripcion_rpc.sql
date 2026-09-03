-- NutrIA — 016: fix de un hallazgo bloqueante del pre-commit-orchestrator
-- sobre el módulo de Suscripciones — riesgo real de cobro duplicado a un
-- paciente, no cosmético.
--
-- `generarCobroSuscripcion` hacía dos escrituras sueltas desde el
-- cliente (insert en `cobros`, después update de `proximo_vencimiento`
-- en `suscripciones_pacientes`) sin transacción. Dos problemas reales,
-- confirmados por el agente:
-- 1. Si el update fallaba después del insert, `proximo_vencimiento`
--    nunca avanzaba — la suscripción seguía "vencida" para siempre, y un
--    reintento (o un doble click, o dos tabs) generaba un SEGUNDO cobro
--    para el mismo período, sin ningún constraint que lo impidiera.
-- 2. Race condition real (no solo por reintento manual): dos requests
--    concurrentes podían leer la suscripción antes de que cualquiera de
--    las dos escribiera, pasar la validación las dos, e insertar dos
--    cobros.
--
-- Fix con dos capas (defense in depth, no una sola):
-- =========================================================
-- 1. Unique index: ningún camino de código, ni futuro ni el de acá,
--    puede insertar dos cobros para la misma suscripción+período.
-- =========================================================
create unique index idx_cobros_suscripcion_periodo
  on cobros(suscripcion_id, fecha_vencimiento)
  where suscripcion_id is not null;

-- =========================================================
-- 2. RPC transaccional: insert + update en una sola transacción, con
-- `for update` (lock de fila) sobre la suscripción — la segunda de dos
-- llamadas concurrentes espera a que la primera termine (commitea el
-- avance de proximo_vencimiento) y entonces ya no pasa la validación de
-- "vencida", en vez de correr en paralelo sobre el mismo estado viejo.
--
-- SECURITY INVOKER (no DEFINER): corre con los permisos/RLS de quien
-- llama — el `select ... for update` ya lo filtra `suscripciones_all_self`
-- (015) a las propias, y se suma `profesional_id = auth_profesional_id()`
-- explícito en el where por el mismo criterio de defense-in-depth que ya
-- usa `confirmar_turno()` (003_rpc_funciones.sql).
--
-- La aritmética de fecha para "mensual" clampea al último día del mes
-- siguiente si el día no existe ahí (ej. 31 ene -> 28/29 feb, no que
-- desborde a marzo) — mismo bug que tenía la versión en TS
-- (avanzarFecha(), Date.UTC + setUTCMonth desbordaba igual que acá sin
-- el clamp). `least()` entre "mismo día del mes siguiente" y "último día
-- del mes siguiente" resuelve los dos casos con una sola expresión.
-- =========================================================
create or replace function public.generar_cobro_suscripcion(p_suscripcion_id uuid)
returns uuid -- id del cobro creado
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_suscripcion suscripciones_pacientes%rowtype;
  v_plan planes_suscripcion%rowtype;
  v_cobro_id uuid;
  v_mes_siguiente date;
  v_ultimo_dia_mes_siguiente date;
  v_dia int;
  v_next date;
begin
  select * into v_suscripcion
  from suscripciones_pacientes
  where id = p_suscripcion_id
    and profesional_id = auth_profesional_id()
  for update;

  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;

  if v_suscripcion.estado <> 'activa' then
    raise exception 'La suscripción no está activa.';
  end if;

  if v_suscripcion.proximo_vencimiento > current_date then
    raise exception 'Todavía no vence.';
  end if;

  select * into v_plan from planes_suscripcion where id = v_suscripcion.plan_id;
  if not found then
    raise exception 'El plan de esta suscripción ya no existe.';
  end if;

  insert into cobros (profesional_id, paciente_id, suscripcion_id, monto, fecha_vencimiento)
  values (
    v_suscripcion.profesional_id,
    v_suscripcion.paciente_id,
    v_suscripcion.id,
    v_plan.monto,
    v_suscripcion.proximo_vencimiento
  )
  returning id into v_cobro_id;

  if v_plan.frecuencia = 'semanal' then
    v_next := v_suscripcion.proximo_vencimiento + 7;
  elsif v_plan.frecuencia = 'quincenal' then
    v_next := v_suscripcion.proximo_vencimiento + 15;
  else -- mensual, con el clamp de fin de mes
    v_mes_siguiente := (date_trunc('month', v_suscripcion.proximo_vencimiento) + interval '1 month')::date;
    v_ultimo_dia_mes_siguiente := (date_trunc('month', v_suscripcion.proximo_vencimiento) + interval '2 month' - interval '1 day')::date;
    v_dia := extract(day from v_suscripcion.proximo_vencimiento)::int;
    v_next := least(v_mes_siguiente + (v_dia - 1), v_ultimo_dia_mes_siguiente);
  end if;

  update suscripciones_pacientes
  set proximo_vencimiento = v_next
  where id = v_suscripcion.id;

  return v_cobro_id;
end;
$$;

grant execute on function public.generar_cobro_suscripcion(uuid) to authenticated;
