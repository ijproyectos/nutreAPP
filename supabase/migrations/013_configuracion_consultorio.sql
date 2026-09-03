-- NutrIA — 013: Configuración → Consultorio, sección "componentes
-- pendientes" (sin RF, sin mockup — decisión explícita del usuario de
-- construir con criterio propio lo que tenga un consumidor real en el
-- código, no toggles decorativos). Ver CLAUDE.md para el detalle de qué
-- se construyó con integración real vs. catálogo standalone, y qué
-- quedó como stub por no tener nada real que controlar todavía.

-- =========================================================
-- sedes / obras_sociales — catálogos simples del profesional. CRUD
-- propio, sin wire-up a `pacientes.sede`/`pacientes.obra_social`
-- (siguen siendo texto libre ahí, ver 008_perfil_paciente.sql) — eso
-- queda como follow-up explícito, no de esta pasada.
-- =========================================================
create table sedes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  nombre text not null,
  direccion text,
  created_at timestamptz not null default now()
);

create index idx_sedes_profesional on sedes(profesional_id);

alter table sedes enable row level security;

create policy sedes_all_self on sedes
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

create table obras_sociales (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create index idx_obras_sociales_profesional on obras_sociales(profesional_id);

alter table obras_sociales enable row level security;

create policy obras_sociales_all_self on obras_sociales
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- profesionales: preferencias con consumidor real ya en este mismo pase
-- (ver CLAUDE.md por dónde se lee cada una) + el catálogo de
-- composición corporal (sin wire-up a Historia Clínica todavía).
-- =========================================================
-- No se agregó "duración de turno por defecto": `turnos` no tiene una
-- columna de duración (solo `fecha_hora` puntual, ver 001), así que no
-- habría nada real que ese campo precargara — se dejó afuera en vez de
-- guardar una preferencia decorativa sin consumidor.
alter table profesionales
  add column tipo_turno_default text check (tipo_turno_default in ('presencial', 'videollamada')),
  add column plantilla_invitacion_whatsapp text,
  add column plantilla_recordatorio_email text,
  add column plantilla_plan_alimentario text,
  add column mensaje_bienvenida_chat text,
  add column metricas_personalizadas text[] not null default '{}';
