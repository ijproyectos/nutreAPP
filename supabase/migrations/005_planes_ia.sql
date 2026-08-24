-- NutrIA — Planes con generación por IA.
-- estado por defecto 'editado_manual': un plan creado a mano por el
-- profesional (RF-060, sin IA) nace "editado" porque nunca pasó por un
-- borrador. El flujo de IA es el único que arranca en 'borrador_ia'.

alter table planes
  add column estado text not null default 'editado_manual'
    check (estado in ('borrador_ia', 'editado_manual', 'enviado')),
  add column generado_con_ia boolean not null default false,
  add column laboratorio_id uuid references laboratorios(id) on delete set null;

create index idx_planes_laboratorio on planes(laboratorio_id);
