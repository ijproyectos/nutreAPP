-- NutrIA — 014: el paciente puede leer la fila de SU profesional.
--
-- Hallazgo bloqueante del pre-commit-orchestrator sobre Configuración
-- (11 secciones): `profesionales_select_self` (002) es `using (user_id =
-- auth.uid())` — un paciente nunca matchea eso, así que CUALQUIER select
-- a `profesionales` desde una sesión de paciente devuelve 0 filas por
-- RLS, sin importar el `.eq("id", ...)` del código (bien armado e
-- irrelevante igual). Esto hacía inalcanzable "Chat del portal" (mensaje
-- de bienvenida, recién agregado) y ya rompía en silencio el nombre del
-- profesional en `obtenerConversacionesPaciente` (portal/chat/actions.ts,
-- preexistente, enmascarado por el fallback "Tu nutricionista").
--
-- Policy nueva, aditiva — `profesionales_select_self` queda intacta.
-- Es de fila completa, no de columna (Postgres no tiene RLS de columna,
-- mismo límite ya documentado para `notas_generales`/`laboratorios.
-- notas_profesional`): un paciente que la matchea puede leer TODAS las
-- columnas de su profesional, no solo mensaje_bienvenida_chat/nombre.
-- Se acepta a propósito acá — a diferencia de esos otros casos, no hay
-- nada en `profesionales` que sea sensible de ocultarle al propio
-- paciente (nombre, matrícula, especialidades, plantillas de mensajes
-- que el paciente igual termina recibiendo) — no hace falta la barrera
-- de capa de aplicación que sí hace falta ahí.
create policy profesionales_select_paciente on profesionales
  for select using (
    id in (select profesional_id from pacientes where user_id = auth.uid())
  );
