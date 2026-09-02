-- NutrIA — 008: Alta de paciente enriquecida (mockup "Alta de paciente").
--
-- Suma lo que el flujo de alta actual no cubre: campos opcionales que el
-- profesional puede cargar de entrada (DNI, obra social, motivo de
-- consulta, sede, quién derivó), y tres bloques nuevos que hoy solo llena
-- el paciente desde el wizard del link de invitación — antecedentes de
-- salud, hábitos y actividad, y consentimiento de uso de datos.
--
-- Completitud del perfil (RF-020, mockup "En la ficha"): se calcula en TS
-- a partir de 5 columnas *_completado_at (una por sección: datos
-- personales, contacto, antecedentes, hábitos, consentimiento), no de la
-- sola presencia de datos — el profesional puede precargar nombre/
-- teléfono al crear el paciente sin que eso cuente como "sección
-- completada por el paciente" (el mockup marca esas fechas recién cuando
-- el paciente las confirma desde el wizard).
--
-- Nada de esto se agrega vía policy de update para el paciente — sigue la
-- decisión de 002_rls_policies.sql ("Sin policy de update para el
-- paciente: edición de ficha queda del lado profesional en v1"), no se
-- reabre acá. En vez de eso, un RPC nuevo (completar_seccion_perfil, en
-- 009_rpc_perfil_paciente.sql) escribe solo estas columnas nuevas con
-- columnas whitelisteadas por sección — el resto de la ficha (nombre,
-- email, estado, etc.) sigue sin ser editable por el paciente.

alter table pacientes
  add column sexo_biologico text check (sexo_biologico in ('femenino', 'masculino')),
  add column dni text,
  add column obra_social text,
  add column motivo_consulta text,
  add column sede text,
  add column quien_derivo text,
  add column condiciones text,
  add column alergias text,
  add column medicacion text,
  add column habitos_comidas text,
  add column habitos_quien_cocina text,
  add column habitos_movimiento text,
  add column consentimiento_datos boolean not null default false,
  add column datos_personales_completado_at timestamptz,
  add column contacto_completado_at timestamptz,
  add column antecedentes_completado_at timestamptz,
  add column habitos_completado_at timestamptz,
  add column consentimiento_completado_at timestamptz;

-- =========================================================
-- invitacion_eventos — log de actividad del link (mockup "Actividad del
-- link": envío por WhatsApp, apertura, sección completada).
-- =========================================================
create table invitacion_eventos (
  id uuid primary key default gen_random_uuid(),
  invitacion_id uuid not null references invitaciones(id) on delete cascade,
  tipo text not null check (tipo in ('enviado_whatsapp', 'abierto', 'seccion_completada')),
  seccion text check (seccion in ('datos_personales', 'contacto', 'antecedentes', 'habitos', 'consentimiento')),
  created_at timestamptz not null default now()
);

create index idx_invitacion_eventos_invitacion on invitacion_eventos(invitacion_id);

alter table invitacion_eventos enable row level security;

-- Solo lectura desde el cliente (para el profesional, vía join con
-- invitaciones/pacientes propios) — todos los inserts pasan por RPCs
-- SECURITY DEFINER en 009_rpc_perfil_paciente.sql: 'enviado_whatsapp' lo
-- dispara el profesional autenticado (podría ser un insert normal, pero
-- se unificó en el mismo RPC que 'abierto' para no duplicar el check de
-- token/pertenencia), y 'abierto'/'seccion_completada' los dispara un
-- paciente que puede no tener sesión todavía (antes de aceptar la
-- invitación) o cuyo user_id recién se está vinculando.
create policy invitacion_eventos_select_profesional on invitacion_eventos
  for select using (
    invitacion_id in (
      select id from invitaciones where profesional_id = auth_profesional_id()
    )
  );
