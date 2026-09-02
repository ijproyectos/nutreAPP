-- NutrIA — 009: RPCs del wizard de perfil del paciente (mockup "Alta de
-- paciente" → "Lo llena el paciente" / "En la ficha").
--
-- Mismo criterio que aceptar_invitacion (003_rpc_funciones.sql): el
-- paciente no tiene policy de update sobre `pacientes` (decisión
-- deliberada, ver 002_rls_policies.sql) y acá tampoco se le da una en
-- blanco — en vez de eso, SECURITY DEFINER + columnas whitelisteadas a
-- mano por sección, nunca un update dinámico a partir de las claves que
-- vengan en el jsonb.

-- =========================================================
-- registrar_evento_invitacion: log de "enviado_whatsapp" / "abierto".
-- Bearer-auth por token, igual que el link mismo — "abierto" pasa antes
-- de que el paciente inicie sesión con Google, así que no puede depender
-- de auth.uid(). "enviado_whatsapp" lo dispara el profesional ya
-- autenticado, pero se unificó acá para no duplicar el lookup de token.
-- =========================================================
create or replace function public.registrar_evento_invitacion(
  p_token uuid,
  p_tipo text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitacion invitaciones%rowtype;
begin
  if p_tipo not in ('enviado_whatsapp', 'abierto') then
    raise exception 'Tipo de evento inválido para este RPC: %', p_tipo;
  end if;

  select * into v_invitacion from invitaciones where token = p_token;
  if not found then
    raise exception 'Invitación inválida.';
  end if;

  -- "enviado_whatsapp" lo dispara un profesional ya autenticado: tiene que
  -- ser el dueño de esta invitación. "abierto" lo dispara el paciente
  -- (o nadie, todavía sin sesión) abriendo el link — sin ese chequeo acá,
  -- auth_profesional_id() da null para ese caller y no aplica.
  if p_tipo = 'enviado_whatsapp'
     and auth_profesional_id() is distinct from v_invitacion.profesional_id then
    raise exception 'No autorizado.';
  end if;

  insert into invitacion_eventos (invitacion_id, tipo)
  values (v_invitacion.id, p_tipo);
end;
$$;

grant execute on function public.registrar_evento_invitacion(uuid, text) to authenticated, anon;

-- =========================================================
-- completar_seccion_perfil: el paciente logueado guarda una sección del
-- wizard (datos_personales/contacto/antecedentes/habitos/consentimiento).
-- Marca *_completado_at = now() y registra el evento correspondiente en
-- invitacion_eventos — es lo que arma la completitud y el timeline de
-- "Actividad del link" en la ficha (mockup "En la ficha").
-- =========================================================
create or replace function public.completar_seccion_perfil(
  p_seccion text,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paciente_id uuid := auth_paciente_id();
  v_invitacion_id uuid;
begin
  if v_paciente_id is null then
    raise exception 'No autorizado: el usuario no tiene un perfil de paciente.';
  end if;

  if p_seccion = 'datos_personales' then
    update pacientes set
      nombre = coalesce(p_datos->>'nombre', nombre),
      fecha_nacimiento = coalesce((p_datos->>'fecha_nacimiento')::date, fecha_nacimiento),
      sexo_biologico = coalesce(p_datos->>'sexo_biologico', sexo_biologico),
      datos_personales_completado_at = now()
    where id = v_paciente_id;

  elsif p_seccion = 'contacto' then
    update pacientes set
      telefono = coalesce(p_datos->>'telefono', telefono),
      contacto_completado_at = now()
    where id = v_paciente_id;

  elsif p_seccion = 'antecedentes' then
    update pacientes set
      condiciones = p_datos->>'condiciones',
      alergias = p_datos->>'alergias',
      medicacion = p_datos->>'medicacion',
      antecedentes_completado_at = now()
    where id = v_paciente_id;

  elsif p_seccion = 'habitos' then
    update pacientes set
      habitos_comidas = p_datos->>'habitos_comidas',
      habitos_quien_cocina = p_datos->>'habitos_quien_cocina',
      habitos_movimiento = p_datos->>'habitos_movimiento',
      habitos_completado_at = now()
    where id = v_paciente_id;

  elsif p_seccion = 'consentimiento' then
    if coalesce((p_datos->>'aceptado')::boolean, false) is not true then
      raise exception 'El consentimiento no fue aceptado.';
    end if;
    update pacientes set
      consentimiento_datos = true,
      consentimiento_completado_at = now()
    where id = v_paciente_id;

  else
    raise exception 'Sección inválida: %', p_seccion;
  end if;

  select id into v_invitacion_id
  from invitaciones
  where paciente_id = v_paciente_id
  order by created_at desc
  limit 1;

  if v_invitacion_id is not null then
    insert into invitacion_eventos (invitacion_id, tipo, seccion)
    values (v_invitacion_id, 'seccion_completada', p_seccion);
  end if;
end;
$$;

grant execute on function public.completar_seccion_perfil(text, jsonb) to authenticated;
