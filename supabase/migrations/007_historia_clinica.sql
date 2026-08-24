-- NutrIA — Historia clínica del paciente (RF-022): completa la ficha con
-- notas generales del profesional. Mediciones e historial de turnos ya
-- tenían tabla + RLS desde 001/002 (mediciones, turnos) — esto solo agrega
-- lo que faltaba (notas), no vuelve a crear nada.

alter table pacientes
  add column notas_generales text;

-- Trade-off de RLS documentado (no un bug, mismo criterio que
-- laboratorios.notas_profesional en 004_laboratorios.sql): la policy
-- pacientes_select_self (002_rls_policies.sql) le permite al paciente
-- leer toda su fila, sin filtro por columna — Postgres RLS es a nivel de
-- fila, no de columna. notas_generales son notas privadas del
-- profesional (alergias, preferencias, lo que sea) y NO deberían llegar
-- al paciente. La barrera acá es de capa de aplicación: ninguna query en
-- src/app/portal/** debe seleccionar esta columna. Si en algún momento
-- hace falta la garantía a nivel de RLS/DB, la solución es una tabla
-- aparte (notas_paciente) con su propia policy en vez de una columna en
-- pacientes — no "arreglar" esto con más policies de columna, Postgres no
-- las tiene nativas sin trucos de vistas.
