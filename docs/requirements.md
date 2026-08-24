# Requisitos funcionales — NutrIA (v1)

Convención: `RF-0XY`, donde `0X` agrupa por módulo (010 auth, 020 pacientes, 030 agenda, 040 dashboard, 050 chat, 060 planes, 070 cobros, 080 portal paciente).

## Auth y onboarding

**RF-010 — Login con Google (ambos roles)**
Login vía Supabase Auth + Google OAuth. Un mismo botón de login para profesional y paciente; el ruteo post-login depende de qué fila exista para ese `auth.users.id`.

**RF-011 — Onboarding profesional (self-serve)**
Si el email logueado no tiene fila en `profesionales` ni en `pacientes`, se muestra un chooser: "¿Sos profesional o fuiste invitado como paciente?". Si elige profesional, se crea su fila en `profesionales` (nombre, consultorio) — sin allowlist, alta abierta.

**RF-012 — Aceptación de invitación (paciente)**
Si elige "fui invitado", pide el link/token de invitación (llega por email) y llama a la RPC `aceptar_invitacion(token)`. Si el email de Google no matchea el de la invitación, o está vencida/usada, se rechaza con mensaje claro. Si no tiene ninguna invitación, se le indica que pida el link a su nutricionista — no se le permite auto-registrarse como paciente.

## Pacientes (lado profesional)

**RF-020 — Alta de paciente + invitación**
Formulario (nombre, email, teléfono opcional, fecha de nacimiento opcional) → RPC `invitar_paciente(...)`, que crea `pacientes` + `invitaciones` atómicamente. Se muestra el link de invitación para copiar/enviar (el envío de email real puede ser manual en v1 — copiar el link y mandarlo por fuera — o vía Resend si da el tiempo, ver `docs/architecture.md`).

**RF-021 — Listado de pacientes**
Búsqueda por nombre/email, filtros: activos / archivados / sin próximo turno (turno futuro más cercano nulo). Sin importación CSV en v1.

**RF-022 — Ficha de paciente**
Datos, historial de turnos, mediciones (peso a lo largo del tiempo), plan vigente, notas. Acción de archivar/reactivar (estado).

## Agenda

**RF-030 — CRUD de turnos**
Crear/editar/cancelar turno (fecha/hora, tipo presencial/videollamada, notas). Cambiar estado manualmente (pendiente/confirmado/en curso/cancelado).

**RF-031 — Confirmación de turno (paciente)**
El paciente confirma su turno pendiente vía RPC `confirmar_turno(id)` — solo puede pasar de pendiente a confirmado, ningún otro cambio de estado ni de datos del turno.

**RF-032 — Brief de continuidad**
Al cerrar una consulta, registrar `consultas` (acordado / completó / cambió) asociada al turno.

## Dashboard "Bandeja de hoy"

**RF-040 — Feed de alertas priorizadas**
Reglas activas en v1 (ambas calculadas con queries reales, no hardcodeadas):
- Pacientes activos sin turno futuro agendado (prioridad Media).
- Turnos de las próximas 48h en estado `pendiente` (sin confirmar) (prioridad Alta).

Reglas de adherencia/riesgo avanzado quedan para fase 2 (requieren más volumen de datos de `registros_comida` para ser útiles).

**RF-041 — Panel de métricas**
% continuidad (pacientes activos con turno futuro / total activos), $ por cobrar (suma `cobros.estado = 'pendiente'`).

**RF-042 — Reenvío de recordatorio (manual)**
Botón "recordar" sobre un turno sin confirmar — dispara un email puntual (no hay cron/envío automático en v1).

## Chat

**RF-050 — Mensajería 1:1**
Lista de conversaciones por paciente (lado profesional) / conversación única con su profesional (lado paciente). Polling simple en v1 (Supabase Realtime queda de mejora, no bloqueante para el MVP).

## Planes alimentarios

**RF-060 — Crear y enviar plan (texto)**
El profesional escribe/edita el plan en texto/markdown y lo asocia a un paciente. `enviado_at` se setea al confirmar el envío — antes de eso es borrador, invisible para el paciente.

**RF-061 — Ver plan vigente (paciente)**
El paciente ve el plan más reciente con `enviado_at` no nulo.

## Cobros

**RF-070 — Registro manual de cobro**
Alta de cobro (monto, vencimiento, asociado opcionalmente a una consulta), marcar como cobrado.

**RF-071 — Reporte de por cobrar**
Listado filtrable por estado, total pendiente. Sin cobro online — `lib/billing.ts` queda como stub (`crearLinkDePago`) para integrar Mercado Pago Checkout Pro en fase 2.

## Portal paciente

**RF-080 — Dashboard paciente**
Próximo turno + botón confirmar, plan vigente (resumen), acceso directo a registrar comida/peso.

**RF-081 — Registrar comida / peso**
Formulario simple: descripción de comida + ¿siguió el plan? (booleano), y/o peso del día. Inserta en `registros_comida` / `mediciones` respectivamente.

**RF-082 — Ver y confirmar turnos**
Listado de turnos propios, confirmar los pendientes.

**RF-083 — Chat con su profesional**
Ver historial y enviar mensajes.

## Fuera de alcance de v1

Ver la lista en `docs/product.md` — cobro online, WhatsApp, CSV, upload de archivos en planes, auditoría, cron de recordatorios, admin interno.
