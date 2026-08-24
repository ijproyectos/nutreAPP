-- NutrIA — Laboratorios clínicos: tabla, RLS, bucket de Storage y sus
-- políticas. El paciente sube el archivo; el profesional valida los
-- valores antes de que puedan usarse como input de un plan (ver
-- docs/architecture.md — la validación humana es obligatoria).

-- =========================================================
-- laboratorios
-- =========================================================
create table laboratorios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  profesional_id uuid not null references profesionales(id) on delete cascade,
  archivo_url text not null, -- path dentro del bucket 'laboratorios', no una URL pública
  fecha_estudio date not null,
  estado text not null default 'pendiente_revision'
    check (estado in ('pendiente_revision', 'validado', 'rechazado')),
  valores jsonb not null default '{}'::jsonb,
  notas_profesional text,
  created_at timestamptz not null default now()
);

create index idx_laboratorios_paciente on laboratorios(paciente_id);
create index idx_laboratorios_profesional on laboratorios(profesional_id);
create index idx_laboratorios_estado on laboratorios(estado);

alter table laboratorios enable row level security;

create policy laboratorios_select_profesional on laboratorios
  for select using (profesional_id = auth_profesional_id());

create policy laboratorios_select_paciente on laboratorios
  for select using (paciente_id = auth_paciente_id());

-- El paciente sube su propio laboratorio (profesional_id se completa con
-- el de su propia ficha, nunca a elección libre del cliente).
create policy laboratorios_insert_paciente on laboratorios
  for insert with check (
    paciente_id = auth_paciente_id()
    and profesional_id = (select profesional_id from pacientes where id = auth_paciente_id())
    and estado = 'pendiente_revision'
  );

-- El profesional valida/rechaza y puede corregir los valores extraídos.
create policy laboratorios_update_profesional on laboratorios
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- El paciente puede seguir editando `valores`/`archivo_url` de SU laboratorio
-- mientras siga pendiente (lo usa el parseo automático justo después de
-- subir el archivo) — pero no puede tocarlo una vez que el profesional lo
-- validó o rechazó, ni puede validarlo/rechazarlo él mismo (el `with check`
-- exige que siga en 'pendiente_revision' de los dos lados).
-- Nota: esto no impide a nivel RLS que el paciente reescriba
-- notas_profesional mientras sigue pendiente — riesgo bajo (solo afecta su
-- propio registro, no puede validarlo ni tocar otros pacientes) y aceptable
-- para v1; si hace falta más adelante, ajustar con un trigger de columnas.
create policy laboratorios_update_paciente_pendiente on laboratorios
  for update using (paciente_id = auth_paciente_id() and estado = 'pendiente_revision')
  with check (paciente_id = auth_paciente_id() and estado = 'pendiente_revision');

-- =========================================================
-- Storage: bucket privado + políticas por carpeta ({paciente_id}/archivo)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'laboratorios',
  'laboratorios',
  false,
  15728640, -- 15 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create policy laboratorios_storage_insert_paciente on storage.objects
  for insert
  with check (
    bucket_id = 'laboratorios'
    and (storage.foldername(name))[1] = public.auth_paciente_id()::text
  );

create policy laboratorios_storage_select_paciente on storage.objects
  for select
  using (
    bucket_id = 'laboratorios'
    and (storage.foldername(name))[1] = public.auth_paciente_id()::text
  );

create policy laboratorios_storage_select_profesional on storage.objects
  for select
  using (
    bucket_id = 'laboratorios'
    and (storage.foldername(name))[1]::uuid in (
      select id from pacientes where profesional_id = public.auth_profesional_id()
    )
  );
