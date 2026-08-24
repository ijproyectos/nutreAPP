-- NutrIA — RLS: helper functions + políticas
-- Chain: auth.uid() -> profesionales.user_id / pacientes.user_id -> filtro de fila.
-- Nunca "using (true)". Funciones SECURITY DEFINER para evitar recursión de RLS
-- al resolver el tenant del usuario logueado (patrón estándar de Supabase).

-- =========================================================
-- Helper functions
-- =========================================================
create or replace function public.auth_profesional_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select id from profesionales where user_id = auth.uid();
$$;

create or replace function public.auth_paciente_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select id from pacientes where user_id = auth.uid();
$$;

grant execute on function public.auth_profesional_id() to authenticated;
grant execute on function public.auth_paciente_id() to authenticated;

-- =========================================================
-- profesionales
-- =========================================================
alter table profesionales enable row level security;

create policy profesionales_select_self on profesionales
  for select using (user_id = auth.uid());

-- Self-signup: cualquier usuario logueado puede crear SU fila de profesional
-- (SaaS de alta abierta, no allowlist). El unique en user_id evita duplicados.
create policy profesionales_insert_self on profesionales
  for insert with check (user_id = auth.uid());

create policy profesionales_update_self on profesionales
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- pacientes
-- =========================================================
alter table pacientes enable row level security;

create policy pacientes_select_profesional on pacientes
  for select using (profesional_id = auth_profesional_id());

create policy pacientes_select_self on pacientes
  for select using (id = auth_paciente_id());

create policy pacientes_insert_profesional on pacientes
  for insert with check (profesional_id = auth_profesional_id());

create policy pacientes_update_profesional on pacientes
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- Sin policy de update para el paciente: edición de ficha queda del lado
-- profesional en v1. El link pacientes.user_id se setea solo vía RPC
-- aceptar_invitacion() (SECURITY DEFINER, ver 003_rpc_funciones.sql).

-- =========================================================
-- invitaciones
-- =========================================================
alter table invitaciones enable row level security;

create policy invitaciones_select_profesional on invitaciones
  for select using (profesional_id = auth_profesional_id());

create policy invitaciones_insert_profesional on invitaciones
  for insert with check (profesional_id = auth_profesional_id());

create policy invitaciones_update_profesional on invitaciones
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- El paciente nunca lee/escribe invitaciones directo: la acepta vía RPC
-- (que valida token + email y corre como SECURITY DEFINER).

-- =========================================================
-- turnos
-- =========================================================
alter table turnos enable row level security;

create policy turnos_select_profesional on turnos
  for select using (profesional_id = auth_profesional_id());

create policy turnos_select_paciente on turnos
  for select using (paciente_id = auth_paciente_id());

create policy turnos_insert_profesional on turnos
  for insert with check (profesional_id = auth_profesional_id());

create policy turnos_update_profesional on turnos
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- El paciente no tiene UPDATE directo sobre turnos: confirma vía RPC
-- confirmar_turno(turno_id), que solo permite pendiente -> confirmado.

-- =========================================================
-- consultas
-- =========================================================
alter table consultas enable row level security;

create policy consultas_select_profesional on consultas
  for select using (profesional_id = auth_profesional_id());

create policy consultas_select_paciente on consultas
  for select using (paciente_id = auth_paciente_id());

create policy consultas_insert_profesional on consultas
  for insert with check (profesional_id = auth_profesional_id());

create policy consultas_update_profesional on consultas
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- mediciones (el paciente puede autorregistrarse)
-- =========================================================
alter table mediciones enable row level security;

create policy mediciones_select_profesional on mediciones
  for select using (profesional_id = auth_profesional_id());

create policy mediciones_select_paciente on mediciones
  for select using (paciente_id = auth_paciente_id());

create policy mediciones_insert_profesional on mediciones
  for insert with check (profesional_id = auth_profesional_id());

create policy mediciones_insert_paciente on mediciones
  for insert with check (
    paciente_id = auth_paciente_id()
    and profesional_id = (select profesional_id from pacientes where id = auth_paciente_id())
  );

-- =========================================================
-- registros_comida (el paciente puede autorregistrarse)
-- =========================================================
alter table registros_comida enable row level security;

create policy registros_comida_select_profesional on registros_comida
  for select using (profesional_id = auth_profesional_id());

create policy registros_comida_select_paciente on registros_comida
  for select using (paciente_id = auth_paciente_id());

create policy registros_comida_insert_profesional on registros_comida
  for insert with check (profesional_id = auth_profesional_id());

create policy registros_comida_insert_paciente on registros_comida
  for insert with check (
    paciente_id = auth_paciente_id()
    and profesional_id = (select profesional_id from pacientes where id = auth_paciente_id())
  );

-- =========================================================
-- planes (el paciente solo ve planes ya enviados, no borradores)
-- =========================================================
alter table planes enable row level security;

create policy planes_select_profesional on planes
  for select using (profesional_id = auth_profesional_id());

create policy planes_select_paciente on planes
  for select using (paciente_id = auth_paciente_id() and enviado_at is not null);

create policy planes_insert_profesional on planes
  for insert with check (profesional_id = auth_profesional_id());

create policy planes_update_profesional on planes
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- cobros (fuera de alcance para el paciente en v1: solo lo ve el profesional)
-- =========================================================
alter table cobros enable row level security;

create policy cobros_select_profesional on cobros
  for select using (profesional_id = auth_profesional_id());

create policy cobros_insert_profesional on cobros
  for insert with check (profesional_id = auth_profesional_id());

create policy cobros_update_profesional on cobros
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- mensajes
-- =========================================================
alter table mensajes enable row level security;

create policy mensajes_select_profesional on mensajes
  for select using (profesional_id = auth_profesional_id());

create policy mensajes_select_paciente on mensajes
  for select using (paciente_id = auth_paciente_id());

create policy mensajes_insert_profesional on mensajes
  for insert with check (
    profesional_id = auth_profesional_id()
    and remitente = 'profesional'
    and paciente_id in (select id from pacientes where profesional_id = auth_profesional_id())
  );

create policy mensajes_insert_paciente on mensajes
  for insert with check (
    paciente_id = auth_paciente_id()
    and remitente = 'paciente'
    and profesional_id = (select profesional_id from pacientes where id = auth_paciente_id())
  );

create policy mensajes_update_leido_profesional on mensajes
  for update using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

create policy mensajes_update_leido_paciente on mensajes
  for update using (paciente_id = auth_paciente_id())
  with check (paciente_id = auth_paciente_id());
