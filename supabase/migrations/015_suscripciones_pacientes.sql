-- NutrIA — 015: Suscripciones de pacientes al profesional (cobro
-- recurrente, pedido explícito del usuario — no estaba en el PRD
-- original ni tiene RF asignado). Extiende `cobros` (RF-070/071, ya
-- construido) en vez de reemplazarlo: una suscripción no cobra sola —
-- genera filas normales de `cobros` que se marcan "cobrado" igual que
-- siempre (confirmado con el usuario: seguimiento manual, sin pasarela
-- de pago — mismo criterio que ya rige todo el módulo de Cobros).
--
-- Sin cron: este proyecto no corre jobs en background (decisión
-- documentada — "recordatorios manuales en vez de cron"). "Generar
-- cobro" es un botón explícito que aparece cuando una suscripción activa
-- ya venció (`proximo_vencimiento <= hoy`), no algo que se dispare solo.

-- =========================================================
-- planes_suscripcion — catálogo de planes recurrentes que ofrece el
-- profesional (ej. "Seguimiento mensual", $15.000, mensual).
-- =========================================================
create table planes_suscripcion (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  nombre text not null,
  monto numeric(10,2) not null check (monto > 0),
  frecuencia text not null check (frecuencia in ('semanal', 'quincenal', 'mensual')),
  created_at timestamptz not null default now()
);

create index idx_planes_suscripcion_profesional on planes_suscripcion(profesional_id);

alter table planes_suscripcion enable row level security;

create policy planes_suscripcion_all_self on planes_suscripcion
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- suscripciones_pacientes — un paciente suscripto a un plan. Sin FK
-- "on delete cascade"/"set null" en plan_id a propósito (default "no
-- action"): borrar un plan con suscripciones activas tiene que fallar
-- explícito, no dejar suscripciones sin plan.
-- =========================================================
create table suscripciones_pacientes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  plan_id uuid not null references planes_suscripcion(id),
  estado text not null default 'activa' check (estado in ('activa', 'pausada', 'cancelada')),
  fecha_inicio date not null default current_date,
  -- Fuente de verdad de "cuándo toca generar el próximo cobro" — se
  -- avanza a mano (avanzarFecha() en actions.ts) cada vez que se genera
  -- un cobro para esta suscripción. Deliberadamente NO se deriva de
  -- fecha_inicio + frecuencia en cada query: eso se rompe con
  -- pausar/reactivar (¿cuenta el tiempo pausado o no?) y esto no.
  proximo_vencimiento date not null,
  created_at timestamptz not null default now()
);

create index idx_suscripciones_pacientes_profesional on suscripciones_pacientes(profesional_id);
create index idx_suscripciones_pacientes_paciente on suscripciones_pacientes(paciente_id);

alter table suscripciones_pacientes enable row level security;

create policy suscripciones_pacientes_all_self on suscripciones_pacientes
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- cobros: link opcional a la suscripción que lo generó — para poder
-- filtrar "cobros de suscripción" vs. sueltos, y para que
-- generarCobroSuscripcion() no duplique un cobro ya generado para el
-- mismo período si se hace doble click.
-- =========================================================
alter table cobros
  add column suscripcion_id uuid references suscripciones_pacientes(id) on delete set null;

create index idx_cobros_suscripcion on cobros(suscripcion_id);
