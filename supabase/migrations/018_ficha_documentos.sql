-- NutrIA — 018: tabla y bucket para el tab "Archivos" de la Ficha de
-- Paciente (mockup NutrIA Ficha de Paciente.dc.html, tab "Archivos") —
-- documentos genéricos (informes, fotos, lo que no sea un laboratorio
-- con su flujo de revisión propio, que ya tiene tabla/bucket
-- dedicados desde 004_laboratorios.sql y no se toca acá).
--
-- Alcance v1: solo el profesional sube — el mockup muestra un dropzone
-- en la Ficha (lado profesional), no una pantalla equivalente en el
-- portal paciente. Si en algún momento el paciente necesita subir sus
-- propios documentos genéricos (no laboratorios), es un policy nuevo,
-- no una migración desde cero.
create table documentos_paciente (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  nombre text not null,
  archivo_url text not null, -- path dentro del bucket documentos-paciente
  archivo_tipo text,
  created_at timestamptz not null default now()
);

create index idx_documentos_paciente_paciente on documentos_paciente(paciente_id);

alter table documentos_paciente enable row level security;

create policy documentos_paciente_all_self on documentos_paciente
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-paciente',
  'documentos-paciente',
  false,
  15728640, -- 15MB, mismo límite que laboratorios/chat-adjuntos
  null -- sin whitelist: informes, fotos, lo que sea razonable
)
on conflict (id) do nothing;

-- Mismo patrón de path que chat-adjuntos: `{paciente_id}/{uuid}-{nombre}` —
-- el profesional solo puede tocar carpetas de sus propios pacientes.
create policy documentos_paciente_select on storage.objects
  for select using (
    bucket_id = 'documentos-paciente'
    and (storage.foldername(name))[1]::uuid in (
      select id from pacientes where profesional_id = public.auth_profesional_id()
    )
  );

create policy documentos_paciente_insert on storage.objects
  for insert with check (
    bucket_id = 'documentos-paciente'
    and (storage.foldername(name))[1]::uuid in (
      select id from pacientes where profesional_id = public.auth_profesional_id()
    )
  );
