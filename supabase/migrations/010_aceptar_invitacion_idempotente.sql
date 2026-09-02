-- NutrIA — 010: aceptar_invitacion pasa a ser idempotente.
--
-- Necesario para el wizard de perfil (009): el mismo link de invitación
-- se reabre más de una vez — el paciente completa 2 de 5 secciones, cierra
-- el link, y el profesional se lo reenvía después ("Pedir lo que falta" /
-- "Reenviar solo lo pendiente" en el mockup "En la ficha") para las que
-- faltan. Antes, un segundo request a este mismo link tiraba "Este
-- paciente ya tiene una cuenta vinculada." porque el update calificaba
-- "where user_id is null" — correcto para bloquear que OTRA cuenta de
-- Google se robe un paciente ya vinculado, pero también bloqueaba a la
-- cuenta correcta reabriendo su propio link.
create or replace function public.aceptar_invitacion(p_token uuid)
returns uuid
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

  if v_invitacion.estado = 'expirada' then
    raise exception 'Invitación vencida.';
  end if;

  if lower(v_invitacion.email) <> lower(v_auth_email) then
    raise exception 'El email de la invitación no coincide con la cuenta de Google usada.';
  end if;

  if v_invitacion.estado = 'pendiente' then
    if v_invitacion.expires_at < now() then
      update invitaciones set estado = 'expirada' where id = v_invitacion.id;
      raise exception 'Invitación vencida.';
    end if;

    update pacientes
    set user_id = auth.uid()
    where id = v_invitacion.paciente_id
      and user_id is null;

    if not found then
      raise exception 'Este paciente ya tiene una cuenta vinculada.';
    end if;

    update invitaciones set estado = 'aceptada' where id = v_invitacion.id;
  else
    -- Ya estaba aceptada: solo es un no-op válido si sigue siendo la MISMA
    -- cuenta de Google. Si no matchea, es un intento real de reusar un
    -- link ya vinculado a otra persona — eso sí tiene que seguir fallando.
    if not exists (
      select 1 from pacientes
      where id = v_invitacion.paciente_id and user_id = auth.uid()
    ) then
      raise exception 'Este paciente ya tiene una cuenta vinculada.';
    end if;
  end if;

  return v_invitacion.paciente_id;
end;
$$;

grant execute on function public.aceptar_invitacion(uuid) to authenticated;
