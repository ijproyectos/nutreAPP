-- Fix: invitar_paciente() tiraba "column reference \"token\" is ambiguous"
-- (42702) en producción al crear cualquier paciente.
--
-- Causa: `returns table (paciente_id uuid, invitacion_id uuid, token uuid)`
-- crea variables de salida con esos nombres. El segundo INSERT hacía
-- `returning id, token into v_invitacion_id, v_token` — "token" ahí es
-- ambiguo entre la columna de la tabla `invitaciones` y la variable de
-- salida `token` de la función (mismo nombre). plpgsql.variable_conflict
-- es 'error' por default, así que Postgres rechaza la sentencia en vez de
-- adivinar — nunca llegaba a insertar la fila.
--
-- Fix: calificar las columnas del RETURNING con "invitaciones." para que
-- no puedan confundirse con las variables de salida. Mismo cuerpo que
-- 003_rpc_funciones.sql salvo esa línea — create or replace es idempotente.
create or replace function public.invitar_paciente(
  p_nombre text,
  p_email text,
  p_telefono text default null,
  p_fecha_nacimiento date default null
)
returns table (paciente_id uuid, invitacion_id uuid, token uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profesional_id uuid := auth_profesional_id();
  v_paciente_id uuid;
  v_invitacion_id uuid;
  v_token uuid;
begin
  if v_profesional_id is null then
    raise exception 'No autorizado: el usuario no tiene un perfil de profesional.';
  end if;

  insert into pacientes (profesional_id, nombre, email, telefono, fecha_nacimiento)
  values (v_profesional_id, p_nombre, p_email, p_telefono, p_fecha_nacimiento)
  returning id into v_paciente_id;

  insert into invitaciones (profesional_id, paciente_id, email)
  values (v_profesional_id, v_paciente_id, p_email)
  returning invitaciones.id, invitaciones.token into v_invitacion_id, v_token;

  return query select v_paciente_id, v_invitacion_id, v_token;
end;
$$;
