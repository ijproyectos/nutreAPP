-- NutrIA — 011: Chat (RF-050/083) más allá del alcance original de v1.
--
-- `mensajes` (1:1) ya existía desde 001/002 — esto suma lo que pedía el
-- mockup nuevo del usuario (`~/Documents/Pantallas/Chat/Chat1.png`) y no
-- estaba en `docs/requirements.md` RF-050 ("Mensajería 1:1... polling
-- simple en v1"): chat de grupo (varios pacientes a la vez) y adjuntos.
-- Deliberadamente AFUERA de este pase (ver CLAUDE.md): la asignación a
-- "Chatbot" que muestra el mockup — es una feature de auto-respuesta por
-- IA, no un chat, y no estaba en el pedido en texto del usuario.

-- =========================================================
-- chat_grupos + chat_grupo_miembros
-- =========================================================
create table chat_grupos (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create index idx_chat_grupos_profesional on chat_grupos(profesional_id);

create table chat_grupo_miembros (
  grupo_id uuid not null references chat_grupos(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (grupo_id, paciente_id)
);

create index idx_chat_grupo_miembros_paciente on chat_grupo_miembros(paciente_id);

-- RLS y policies de ambas tablas van DESPUÉS de crear las dos — la policy
-- de "miembro" de chat_grupos referencia chat_grupo_miembros y viceversa,
-- así que ninguna de las dos puede tener su policy completa hasta que
-- exista la otra tabla. (Bug real de la v1 de este archivo: la corrida
-- original creaba las policies de chat_grupos intercaladas con la tabla
-- chat_grupo_miembros y rompía acá — psql sin transacción explícita ya
-- había commiteado chat_grupos + 1 policy antes de fallar; se limpió con
-- un DROP TABLE chat_grupos antes de reaplicar esta versión corregida.)
alter table chat_grupos enable row level security;
alter table chat_grupo_miembros enable row level security;

create policy chat_grupos_select_profesional on chat_grupos
  for select using (profesional_id = auth_profesional_id());

-- Un miembro necesita poder resolver el nombre del grupo en el que está
-- (para renderizar la lista de conversaciones de su lado) — sin esto solo
-- vería filas de `chat_grupo_miembros`, no el grupo en sí.
create policy chat_grupos_select_miembro on chat_grupos
  for select using (
    id in (select grupo_id from chat_grupo_miembros where paciente_id = auth_paciente_id())
  );

create policy chat_grupos_insert_profesional on chat_grupos
  for insert with check (profesional_id = auth_profesional_id());

-- Nota de alcance (grupo real, no un broadcast disfrazado): los
-- miembros de un mismo grupo se ven entre sí — es la semántica esperada
-- de "chat de grupo" que pidió el mockup, no un bug de RLS. El
-- profesional controla la membresía (solo él inserta filas acá).
create policy chat_grupo_miembros_select_profesional on chat_grupo_miembros
  for select using (
    grupo_id in (select id from chat_grupos where profesional_id = auth_profesional_id())
  );

create policy chat_grupo_miembros_select_miembro on chat_grupo_miembros
  for select using (
    grupo_id in (select grupo_id from chat_grupo_miembros where paciente_id = auth_paciente_id())
  );

create policy chat_grupo_miembros_insert_profesional on chat_grupo_miembros
  for insert with check (
    grupo_id in (select id from chat_grupos where profesional_id = auth_profesional_id())
    and paciente_id in (select id from pacientes where profesional_id = auth_profesional_id())
  );

-- =========================================================
-- mensajes: soporte de grupo + adjuntos.
--
-- `paciente_id` pasa a nullable — un mensaje de grupo no tiene un
-- paciente destinatario único. El check garantiza que sea uno u otro,
-- nunca los dos ni ninguno. `remitente_paciente_id` identifica QUÉ
-- paciente mandó un mensaje de grupo con remitente='paciente' (en 1:1
-- ya lo dice `paciente_id`, así que solo hace falta acá).
-- =========================================================
alter table mensajes alter column paciente_id drop not null;
alter table mensajes alter column contenido set default '';

alter table mensajes
  add column grupo_id uuid references chat_grupos(id) on delete cascade,
  add column remitente_paciente_id uuid references pacientes(id) on delete set null,
  add column archivo_url text,
  add column archivo_nombre text,
  add column archivo_tipo text;

alter table mensajes
  add constraint mensajes_destino_check check (
    (paciente_id is not null) <> (grupo_id is not null)
  );

alter table mensajes
  add constraint mensajes_remitente_grupo_check check (
    not (grupo_id is not null and remitente = 'paciente' and remitente_paciente_id is null)
  );

create index idx_mensajes_grupo on mensajes(grupo_id);

-- Policies NUEVAS y aditivas — las 4 de 002_rls_policies.sql (select/
-- insert profesional y paciente para 1:1) quedan intactas: Postgres
-- combina varias policies permisivas del mismo comando con OR, así que
-- alcanza con sumar la rama de grupo sin tocar la rama de 1:1 existente.
create policy mensajes_select_paciente_grupo on mensajes
  for select using (
    grupo_id in (select grupo_id from chat_grupo_miembros where paciente_id = auth_paciente_id())
  );

create policy mensajes_insert_profesional_grupo on mensajes
  for insert with check (
    profesional_id = auth_profesional_id()
    and remitente = 'profesional'
    and grupo_id in (select id from chat_grupos where profesional_id = auth_profesional_id())
  );

create policy mensajes_insert_paciente_grupo on mensajes
  for insert with check (
    remitente = 'paciente'
    and remitente_paciente_id = auth_paciente_id()
    and grupo_id in (select grupo_id from chat_grupo_miembros where paciente_id = auth_paciente_id())
    and profesional_id = (select profesional_id from chat_grupos where id = grupo_id)
  );

-- Sin política de "leído" para grupo a propósito: `leido` es un booleano
-- por mensaje, no por destinatario — en un 1:1 alcanza (hay un solo
-- lector posible del lado paciente), pero en un grupo "leído por quién"
-- necesitaría una tabla de lecturas por miembro. Se difiere: los mensajes
-- de grupo no tienen contador de no-leídos preciso en v1 (ver
-- `lib/queries/chats.ts`).

-- =========================================================
-- Storage: bucket privado de adjuntos de chat.
-- Path: `{paciente|grupo}/{destino_id}/{uuid}-{nombre}` — el primer
-- segmento identifica el tipo de destino para poder escribir policies
-- distintas sin ambigüedad (mismo patrón que 004_laboratorios.sql, pero
-- con un segmento extra porque acá hay dos tipos de destino posibles).
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-adjuntos',
  'chat-adjuntos',
  false,
  15728640, -- 15 MB, mismo límite que next.config.ts (bodySizeLimit) y el bucket de laboratorios
  null -- sin whitelist de mime types: a diferencia de laboratorios (solo estudios), acá se espera cualquier adjunto razonable (fotos, PDFs, documentos)
)
on conflict (id) do nothing;

create policy chat_adjuntos_insert_profesional on storage.objects
  for insert with check (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid in (
          select id from pacientes where profesional_id = public.auth_profesional_id()
        )
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select id from chat_grupos where profesional_id = public.auth_profesional_id()
        )
      )
    )
  );

create policy chat_adjuntos_insert_paciente on storage.objects
  for insert with check (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid = public.auth_paciente_id()
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select grupo_id from chat_grupo_miembros where paciente_id = public.auth_paciente_id()
        )
      )
    )
  );

-- Select: mismo criterio que insert (quien puede escribir en esa carpeta
-- puede leerla) — se separa en dos policies por rol en vez de reusar una
-- función helper para no acoplar storage a un cambio futuro en las
-- policies de mensajes/chat_grupos.
create policy chat_adjuntos_select_profesional on storage.objects
  for select using (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid in (
          select id from pacientes where profesional_id = public.auth_profesional_id()
        )
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select id from chat_grupos where profesional_id = public.auth_profesional_id()
        )
      )
    )
  );

create policy chat_adjuntos_select_paciente on storage.objects
  for select using (
    bucket_id = 'chat-adjuntos'
    and (
      (
        (storage.foldername(name))[1] = 'paciente'
        and (storage.foldername(name))[2]::uuid = public.auth_paciente_id()
      )
      or (
        (storage.foldername(name))[1] = 'grupo'
        and (storage.foldername(name))[2]::uuid in (
          select grupo_id from chat_grupo_miembros where paciente_id = public.auth_paciente_id()
        )
      )
    )
  );
