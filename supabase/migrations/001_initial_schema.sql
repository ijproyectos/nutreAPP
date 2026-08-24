-- NutrIA — schema inicial
-- Multi-tenant: cada fila de negocio lleva profesional_id directo (ver docs/data-model.md).
-- Corre completo a mano vía psql/pooler la primera vez que se crea el proyecto Supabase.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================
-- profesionales (tenant)
-- =========================================================
create table profesionales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  consultorio text,
  plan_id text not null default 'free',
  created_at timestamptz not null default now()
);

-- =========================================================
-- pacientes
-- =========================================================
create table pacientes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  telefono text,
  email text not null,
  fecha_nacimiento date,
  estado text not null default 'activo' check (estado in ('activo', 'archivado')),
  created_at timestamptz not null default now()
);

create index idx_pacientes_profesional on pacientes(profesional_id);
create index idx_pacientes_email on pacientes(email);

-- =========================================================
-- invitaciones
-- =========================================================
create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'expirada')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index idx_invitaciones_profesional on invitaciones(profesional_id);
create index idx_invitaciones_token on invitaciones(token);

-- =========================================================
-- turnos
-- =========================================================
create table turnos (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  fecha_hora timestamptz not null,
  tipo text not null check (tipo in ('presencial', 'videollamada')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'en_curso', 'cancelado')),
  notas text,
  created_at timestamptz not null default now()
);

create index idx_turnos_profesional on turnos(profesional_id);
create index idx_turnos_paciente on turnos(paciente_id);
create index idx_turnos_fecha_hora on turnos(fecha_hora);

-- =========================================================
-- consultas (brief de continuidad)
-- =========================================================
create table consultas (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  turno_id uuid references turnos(id) on delete set null,
  acordado text,
  completo text,
  cambio text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_consultas_profesional on consultas(profesional_id);
create index idx_consultas_paciente on consultas(paciente_id);

-- =========================================================
-- mediciones
-- =========================================================
create table mediciones (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  fecha date not null default current_date,
  peso numeric(6,2),
  otras_metricas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_mediciones_paciente on mediciones(paciente_id);

-- =========================================================
-- registros_comida
-- =========================================================
create table registros_comida (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,
  adherencia boolean,
  created_at timestamptz not null default now()
);

create index idx_registros_comida_paciente on registros_comida(paciente_id);

-- =========================================================
-- planes
-- =========================================================
create table planes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  contenido text not null,
  archivo_url text,
  enviado_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_planes_paciente on planes(paciente_id);

-- =========================================================
-- cobros
-- =========================================================
create table cobros (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  consulta_id uuid references consultas(id) on delete set null,
  monto numeric(10,2) not null check (monto >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'cobrado')),
  fecha_vencimiento date,
  created_at timestamptz not null default now()
);

create index idx_cobros_profesional on cobros(profesional_id);
create index idx_cobros_paciente on cobros(paciente_id);
create index idx_cobros_estado on cobros(estado);

-- =========================================================
-- mensajes
-- =========================================================
create table mensajes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  remitente text not null check (remitente in ('profesional', 'paciente')),
  contenido text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_mensajes_paciente on mensajes(paciente_id);
create index idx_mensajes_created_at on mensajes(created_at);
