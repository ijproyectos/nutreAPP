-- NutrIA — 017: catálogo de precios (Servicios/Productos) para Cobros,
-- a partir del mockup nuevo `NutrIA Cobros.dc.html`
-- (~/Documents/Pantallas/Cobros y Link/Rediseño visual de NutrIA_cobros).
-- Confirmado con el usuario: se construye completo (no solo la pestaña
-- "Pagos", que ya existía como /app/cobros) — el toggle "público"/"en tu
-- link de reservas" queda como campo real aunque el link de reservas en
-- sí todavía no exista (Configuración → Reservas online sigue
-- "Próximamente"), y el aviso masivo del aumento de precios se degrada a
-- links de WhatsApp manuales por paciente (como el resto de la app —
-- ver catalogo-actions.ts), nunca un envío automático en bloque.

-- =========================================================
-- Catálogo: cada fila es un servicio, paquete o producto que el
-- profesional puede cobrar. `clase` distingue las 3 pestañas del
-- mockup — "Servicios" lista consulta+paquete, "Productos" lista
-- producto (ver servicios/productos pages).
-- =========================================================
create table servicios_precios (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profesionales(id) on delete cascade,
  nombre text not null,
  clase text not null check (clase in ('consulta', 'paquete', 'producto')),
  -- Campo de texto libre a propósito — el mockup lo relabelea según la
  -- clase ("Duración" / "Qué incluye" / "Entrega") pero es el mismo dato,
  -- no ameritaba 3 columnas distintas.
  duracion_o_entrega text,
  modalidad text not null check (
    modalidad in ('presencial_video', 'videollamada', 'domicilio', 'digital')
  ),
  precio numeric(12, 2) not null check (precio > 0),
  -- "Mostrar en tu link de reservas" — real, pero sin consumidor todavía
  -- (no existe el link de reservas público). Se construye igual porque
  -- el usuario lo pidió explícito para este pase; el día que se
  -- construya Reservas online, esta columna ya está lista.
  publico boolean not null default true,
  -- Soft delete ("Archivar" en el mockup, no "Eliminar") — a propósito:
  -- los cobros ya generados con este servicio (servicio_id en `cobros`)
  -- tienen que seguir resolviendo el nombre/precio histórico, y un
  -- archivado no debe romper esa referencia. Por eso `cobros.servicio_id`
  -- no lleva `on delete cascade`/`set null` — nunca hay un delete real.
  archivado boolean not null default false,
  -- Se resetea a `now()` cada vez que cambia el precio (ver
  -- crearOEditarServicio/aplicarAumentoPrecios) — de acá sale "hace N
  -- meses" y la alerta de precio desactualizado (>= 4 meses) que ya
  -- usaba el mockup.
  precio_actualizado_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_servicios_precios_profesional
  on servicios_precios(profesional_id)
  where not archivado;

alter table servicios_precios enable row level security;

create policy servicios_precios_all_self on servicios_precios
  for all
  using (profesional_id = auth_profesional_id())
  with check (profesional_id = auth_profesional_id());

-- =========================================================
-- cobros gana un link opcional al catálogo — de acá sale el "uso"/
-- ingresos por servicio del mockup (cuántas veces se cobró cada uno
-- este mes). Nullable: un cobro manual sin servicio asociado (el 99% de
-- los cobros ya cargados antes de esta migración) sigue siendo válido,
-- el picker en NuevoCobroDialog es opcional.
-- =========================================================
alter table cobros add column servicio_id uuid references servicios_precios(id);

create index idx_cobros_servicio on cobros(servicio_id) where servicio_id is not null;

-- =========================================================
-- RPC para "Actualizar precios" (aumento masivo). No es un simple
-- .update() del cliente porque el precio nuevo de cada fila depende de
-- SU PROPIO precio actual (round(precio * (1+pct/100) / 500) * 500) —
-- eso es una expresión de columna, no un valor literal, así que el
-- cliente Supabase no lo puede expresar en un .update() suelto. Mismo
-- criterio que 016 (dinero de por medio, mejor una sola sentencia
-- atómica en el servidor que N updates sueltos desde el cliente).
--
-- SECURITY INVOKER: RLS ya scopea el update a profesional_id propio
-- (`servicios_precios_all_self`), el filtro explícito de acá es
-- defense-in-depth, mismo criterio que `generar_cobro_suscripcion`.
-- =========================================================
create or replace function public.aplicar_aumento_precios(p_pct numeric, p_alcance text)
returns integer -- cantidad de filas actualizadas
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_pct is null or p_pct <= 0 then
    raise exception 'Porcentaje inválido';
  end if;
  if p_alcance not in ('todo', 'consultas', 'desactualizados') then
    raise exception 'Alcance inválido';
  end if;

  update servicios_precios
  set precio = round(precio * (1 + p_pct / 100.0) / 500) * 500,
      precio_actualizado_at = now()
  where profesional_id = auth_profesional_id()
    and archivado = false
    and (p_alcance <> 'consultas' or clase in ('consulta', 'paquete'))
    and (p_alcance <> 'desactualizados' or precio_actualizado_at <= now() - interval '4 months');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
