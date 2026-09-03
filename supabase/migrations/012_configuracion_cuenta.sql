-- NutrIA — 012: Configuración → "Cuenta" (sin RF asignado — mockup nuevo
-- del usuario en `~/Documents/Pantallas/Configuracion/`). Única de 17
-- secciones del mockup con diseño real; el resto queda como
-- "Próximamente" en el código (ver CLAUDE.md) — no hay columnas nuevas
-- para eso todavía.
--
-- Sin RPC ni policy nueva: `profesionales_update_self` (002) ya permite
-- que el profesional actualice cualquier columna de su propia fila
-- (`using (user_id = auth.uid())`), a diferencia del paciente (que no
-- tiene esa policy a propósito). Estas columnas son un ALTER TABLE liso.

alter table profesionales
  add column apellido text,
  add column telefono text,
  add column matricula_nacional text,
  add column matricula_provincial text,
  add column profesion text,
  add column especialidades text[] not null default '{}',
  add column avatar_url text,
  add column firma_url text;

-- =========================================================
-- Storage: bucket privado para avatar + firma digital del profesional.
-- Path: `{profesional_id}/{avatar|firma}-{uuid}-{nombre}`. A diferencia
-- de `chat-adjuntos`/`laboratorios`, acá solo el propio profesional lee
-- y escribe — ningún paciente necesita acceso, así que las policies son
-- de un solo rol, sin la rama paciente/grupo de chat.
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profesional-archivos',
  'profesional-archivos',
  false,
  5242880, -- 5 MB — son imágenes chicas (avatar/firma), no PDFs de laboratorio
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy profesional_archivos_insert on storage.objects
  for insert with check (
    bucket_id = 'profesional-archivos'
    and (storage.foldername(name))[1]::uuid = auth_profesional_id()
  );

create policy profesional_archivos_select on storage.objects
  for select using (
    bucket_id = 'profesional-archivos'
    and (storage.foldername(name))[1]::uuid = auth_profesional_id()
  );

-- Reemplazar avatar/firma es "subir de nuevo" (un insert con path nuevo,
-- ver actions.ts) — no hace falta policy de update/delete sobre Storage
-- para eso; el archivo viejo queda huérfano hasta un barrido futuro,
-- mismo trade-off aceptado ya en otros lados del proyecto (no se agrega
-- limpieza automática para esto en v1).
