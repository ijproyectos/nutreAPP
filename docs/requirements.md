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
El profesional escribe/edita el plan en texto/markdown y lo asocia a un paciente. `enviado_at` se setea al confirmar el envío — antes de eso es borrador, invisible para el paciente. **Estado real**: implementado como edición/envío (RF-063) desde la ficha del paciente, pero hoy el único camino para *crear* la primera versión de un plan es RF-062 (generar con IA) — no hay todavía un botón de "escribir un plan desde cero" sin pasar por la IA. Pendiente si hace falta.

**RF-061 — Ver plan vigente (paciente)**
El paciente ve el plan más reciente con `enviado_at` no nulo. Implementado en `/portal/plan`.

**RF-062 — Generar borrador de plan con IA**
Desde la ficha del paciente: botón "Generar plan con IA" arma el prompt con datos del paciente, notas del profesional, última medición y el laboratorio **validado** más reciente (nunca uno pendiente/rechazado), y llama a la API de Anthropic (`claude-opus-5`) pidiendo salida estructurada (JSON validado contra schema, no texto libre). El resultado entra como `planes.estado = 'borrador_ia'`, `generado_con_ia = true` — invisible para el paciente hasta RF-063. Ver `docs/architecture.md` §10.

**RF-063 — Editar y enviar el plan**
El profesional edita libremente el contenido (texto) en la ficha del paciente. "Guardar borrador" → `estado = 'editado_manual'`. "Enviar al paciente" → `estado = 'enviado'`, `enviado_at = now()`, recién ahí lo ve el paciente. No existe ningún camino de código que envíe un plan generado por IA sin pasar por esta pantalla.

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

**RF-084 — Subir laboratorio**
PDF/JPG/PNG/HEIC hasta 15MB + fecha del estudio → sube a Storage privado, queda `pendiente_revision`. Intenta parsear valores automáticamente (solo PDF con texto, sin OCR) — si no detecta nada, no bloquea la subida, el profesional carga a mano al validar.

**RF-085 — Ver mis laboratorios**
Listado propio con estado (pendiente/validado/rechazado), valores detectados/cargados, y la nota del profesional si la dejó al validar.

## Laboratorios clínicos (lado profesional)

Agregado post-v1 (no estaba en el checklist original del MVP) — ver `docs/architecture.md` §9 para el diseño técnico (bucket, RLS, parseo).

**RF-090 — Revisar y validar laboratorio**
Desde la ficha del paciente (`/app/pacientes/[id]`): ver el archivo (link firmado, temporal), editar los valores detectados o cargarlos a mano, y marcar `validado` o `rechazado`. Solo un laboratorio `validado` puede usarse como input de un plan generado con IA (RF-100, no implementado todavía).

**RF-091 — Alerta de laboratorios sin revisar**
Bandeja de hoy: regla nueva, prioridad MEDIA — laboratorios en `pendiente_revision` hace más de 48hs, con link directo a la ficha del paciente correspondiente.

## Fuera de alcance de v1

Ver la lista en `docs/product.md` — cobro online, WhatsApp, CSV, upload de archivos en planes, auditoría, cron de recordatorios, admin interno.
