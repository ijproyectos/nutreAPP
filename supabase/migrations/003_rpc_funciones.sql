-- NutrIA — RPCs atómicas para los flujos críticos.
-- invitar_paciente / confirmar_turno: SECURITY INVOKER (el que llama ya tiene
--   permisos vía RLS; la función solo garantiza que los pasos sean atómicos).
-- aceptar_invitacion: SECURITY DEFINER (el paciente todavía no tiene fila
--   propia en `pacientes` con user_id seteado, así que no pasaría RLS solo).

-- =========================================================
-- invitar_paciente: alta de paciente + invitación en una transacción
-- =========================================================
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

  -- Columnas calificadas con "invitaciones." en el RETURNING: sin esto,
  -- "token" es ambiguo entre la columna de la tabla y la variable de salida
  -- `token` que crea `returns table (..., token uuid)` (mismo nombre) —
  -- plpgsql.variable_conflict default es 'error', así que rompe en runtime,
  -- no en el CREATE FUNCTION. Ver 006_fix_invitar_paciente_token_ambiguo.sql.
  insert into invitaciones (profesional_id, paciente_id, email)
  values (v_profesional_id, v_paciente_id, p_email)
  returning invitaciones.id, invitaciones.token into v_invitacion_id, v_token;

  return query select v_paciente_id, v_invitacion_id, v_token;
end;
$$;

grant execute on function public.invitar_paciente(text, text, text, date) to authenticated;

-- =========================================================
-- aceptar_invitacion: el paciente linkea su cuenta de Google a su ficha
-- =========================================================
create or replace function public.aceptar_invitacion(p_token uuid)
returns uuid -- paciente_id vinculado
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitacion invitaciones%rowtype;
  v_auth_email text;
begin
  select email into v_auth_email
  from auth.users where id = auth.uid();

  if v_auth_email is null then
    raise exception 'No autorizado.';
  end if;

  select * into v_invitacion
  from invitaciones
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitación inválida.';
  end if;

  if v_invitacion.estado <> 'pendiente' then
    raise exception 'Invitación ya usada o cancelada.';
  end if;

  if v_invitacion.expires_at < now() then
    update invitaciones set estado = 'expirada' where id = v_invitacion.id;
    raise exception 'Invitación vencida.';
  end if;

  if lower(v_invitacion.email) <> lower(v_auth_email) then
    raise exception 'El email de la invitación no coincide con la cuenta de Google usada.';
  end if;

  update pacientes
  set user_id = auth.uid()
  where id = v_invitacion.paciente_id
    and user_id is null; -- evita re-linkear un paciente ya aceptado

  if not found then
    raise exception 'Este paciente ya tiene una cuenta vinculada.';
  end if;

  update invitaciones set estado = 'aceptada' where id = v_invitacion.id;

  return v_invitacion.paciente_id;
end;
$$;

grant execute on function public.aceptar_invitacion(uuid) to authenticated;

-- =========================================================
-- confirmar_turno: el paciente solo puede pasar pendiente -> confirmado
-- =========================================================
create or replace function public.confirmar_turno(p_turno_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_paciente_id uuid := auth_paciente_id();
  v_estado text;
begin
  if v_paciente_id is null then
    raise exception 'No autorizado: el usuario no tiene un perfil de paciente.';
  end if;

  select estado into v_estado
  from turnos
  where id = p_turno_id and paciente_id = v_paciente_id
  for update;

  if not found then
    raise exception 'Turno no encontrado.';
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'Solo se puede confirmar un turno pendiente (estado actual: %).', v_estado;
  end if;

  update turnos set estado = 'confirmado' where id = p_turno_id;
end;
$$;

grant execute on function public.confirmar_turno(uuid) to authenticated;
