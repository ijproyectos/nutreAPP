# Arquitectura — NutrIA

## 1. Stack

- **Frontend + backend**: Next.js 16 (App Router, Turbopack), TypeScript, sobre Vercel.
- **Datos/Auth/Storage**: Supabase (Postgres administrado, Auth con Google OAuth, Row Level Security, Storage — bucket privado `laboratorios` en uso desde v1, ver §9; el resto de Storage — archivos de planes — sigue en fase 2). Realtime disponible para el chat si hace falta.
- **UI**: Tailwind CSS 4 + shadcn/ui (estilo `base-nova`, sobre `@base-ui/react`, no Radix — la composición trigger/select/dialog usa `render` prop en vez de `asChild`). Iconos Lucide.
- **Validación/forms**: Zod + React Hook Form.
- **Data fetching**: Server Components por default; TanStack Query solo donde haga falta cache/mutación del lado del cliente (ej. chat con polling).
- **Deploy**: Vercel (frontend), GitHub Actions para CI (lint/typecheck/build) antes de merge a `main`.

Un solo Next.js app (`apps/web`), no hace falta monorepo real: el backend es Supabase, no hay servidor propio que orquestar.

## 2. Estructura de rutas

Un solo proyecto Next.js, dos superficies separadas por prefijo de ruta y rol:

```
apps/web/src/app/
  (auth)/login/            # login compartido (botón Google)
  (auth)/onboarding/       # chooser "sos profesional o fuiste invitado" + aceptar invitación
  (auth)/callback/         # callback de OAuth de Supabase
  app/                     # panel profesional — requiere fila en `profesionales`
    page.tsx               # Bandeja de hoy
    pacientes/
    agenda/
    chats/
    planes/
    cobros/
  portal/                  # portal paciente — requiere fila en `pacientes` con user_id seteado
    page.tsx                # dashboard paciente
    turnos/
    plan/
    registro/
    chat/
```

`src/proxy.ts` (reemplazo de `middleware.ts` en Next 16) valida la sesión y redirige:
- sin sesión → `/login`
- sesión sin `profesionales` ni `pacientes.user_id` asociado → `/onboarding`
- sesión de profesional pisando `/portal/*` → redirige a `/app`
- sesión de paciente pisando `/app/*` → redirige a `/portal`

## 3. Multi-tenancy y RLS

Cada profesional es un tenant. Toda tabla de negocio lleva `profesional_id` **directo** (aunque también tenga `paciente_id`) — evita policies con subqueries/joins anidados y mantiene un único patrón repetible. Detalle completo del esquema: `docs/data-model.md`.

Cadena de policy: `auth.uid()` → función `auth_profesional_id()` / `auth_paciente_id()` (SECURITY DEFINER, resuelven el tenant/paciente del usuario logueado sin recursión de RLS) → filtro `profesional_id = ...` / `paciente_id = ...` en cada tabla. Nunca `using (true)`.

Dos "lados" con distinto alcance de RLS:
- **Profesional**: CRUD completo sobre sus propias filas (`profesional_id = auth_profesional_id()`).
- **Paciente**: solo lectura de lo suyo (`paciente_id = auth_paciente_id()`), salvo `mediciones`/`registros_comida` (puede insertar, autorregistro) y mutaciones puntuales vía RPC (`confirmar_turno`, `aceptar_invitacion`) en vez de UPDATE directo — evita que un paciente reagende/cancele su propio turno o edite campos que no debería tocar.

## 4. Auth — self-serve profesional, invitación paciente

Distinto del patrón de un producto interno de un solo tenant (allowlist hardcodeada): acá cualquiera puede darse de alta como profesional (es el modelo de negocio del SaaS). El paciente **nunca** se autorregistra: solo entra si un profesional lo invitó.

Flujo:
1. Profesional crea el paciente + invitación → RPC `invitar_paciente(...)` (atómica, `SECURITY INVOKER`). Devuelve `token`.
2. Se genera un link `https://.../onboarding/invitacion/[token]` — v1: copiar/enviar manualmente o por Resend si da el tiempo (no bloqueante para el MVP).
3. El paciente entra al link, hace login con Google, y la página llama a `aceptar_invitacion(token)` (`SECURITY DEFINER`) — valida token vigente + email del JWT vs email de la invitación, y linkea `pacientes.user_id = auth.uid()`.
4. Login siguiente: `pacientes.user_id` ya está seteado, entra directo al portal.

**Google OAuth — importante, distinto de un proyecto interno**: con pacientes reales de terceros, el consent screen en modo *Testing* no alcanza (tope de 100 test users + warning de "app no verificada"). Hay que iniciar el proceso de **verificación de la app OAuth** en Google Cloud Console en paralelo al desarrollo — puede tardar días/semanas, es el ítem de mayor lead time externo del roadmap. Mientras tanto, desarrollo/QA funciona con test users igual que cualquier app en Testing.

## 5. Integridad transaccional — flujos críticos

Todos como funciones Postgres (`plpgsql`), no encadenados desde el frontend:

- `invitar_paciente(nombre, email, telefono, fecha_nacimiento)` — alta de paciente + invitación en una transacción.
- `aceptar_invitacion(token)` — valida y linkea la cuenta del paciente.
- `confirmar_turno(turno_id)` — único cambio de estado que puede hacer un paciente sobre un turno, y solo pendiente→confirmado.

Todo lo demás (turnos, cobros, planes, mensajes, mediciones) son inserts/updates simples con RLS de por sí suficiente — no necesitan una RPC dedicada porque no hay un cálculo derivado ni multi-tabla que proteger (a diferencia de, por ejemplo, un movimiento de stock con recálculo de costo promedio en otro dominio).

## 6. Deferido deliberadamente (no en v1)

Explicado con el porqué, para no reabrir la discusión sin motivo:

| Ítem | Por qué se difiere |
|---|---|
| Cron de recordatorios automáticos | Requiere infraestructura de scheduling (Vercel Cron / `pg_cron`) separada del resto del flujo; v1 lo resuelve con un botón manual de "recordar" sobre la Bandeja de hoy. |
| Upload de archivo en planes (Storage) | Bucket + políticas RLS de Storage es una superficie de seguridad aparte; v1 usa texto/markdown, columna `archivo_url` ya reservada para cuando se sume. |
| Cobro online (Mercado Pago/Stripe) | Fase 2 explícita del PRD; `lib/billing.ts` queda con un stub `crearLinkDePago()`. |
| Importación CSV de pacientes | Solo alta manual en v1, menos superficie de validación/errores para la primera versión. |
| Auditoría de accesos | NFR real pero no bloqueante para un primer uso con pocos usuarios; se arma con triggers a una tabla `auditoria` cuando haga falta. |
| WhatsApp | Alto impacto en LATAM pero requiere proveedor (Twilio/360dialog) aparte; queda para cuando el flujo de email esté probado. |

## 7. Infraestructura recomendada

| Capa | Recomendación |
|---|---|
| Frontend + backend | Next.js en Vercel |
| DB + Auth + Storage | Supabase |
| Facturación SaaS (NutrIA → profesional) | Stripe Billing o Mercado Pago Suscripciones — fase 2, no en v1 |
| Cobro paciente → profesional | Mercado Pago Checkout Pro — fase 2 |
| Email transaccional | Resend o Postmark (invitaciones, recordatorios manuales) |
| Monitoreo de errores | Sentry |
| CI/CD | GitHub Actions (lint/typecheck/build) + deploy automático de Vercel |

## 8. Variables de entorno

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
La service role key nunca se expone al frontend — solo se usa server-side si hace falta (ej. un futuro job de recordatorios), nunca en un componente cliente ni en una ruta pública.

## 9. Laboratorios clínicos

Dato de salud sensible — bucket de Storage **privado** (`laboratorios`, `supabase/migrations/004_laboratorios.sql`), nunca público. Convención de path: `{paciente_id}/{uuid}-{nombre_original}` — las políticas RLS de `storage.objects` extraen el primer segmento del path (`storage.foldername(name)[1]`) y lo comparan contra `auth_paciente_id()` (dueño) o contra los pacientes del profesional logueado (mismo patrón de las funciones helper de `002_rls_policies.sql`, referenciadas como `public.auth_*_id()` porque el `search_path` en el contexto de `storage.objects` no incluye `public` por default).

**Flujo de subida**: todo pasa por una única Server Action (`src/app/portal/laboratorios/actions.ts` → `subirLaboratorio`), no por un route handler separado — sube el archivo a Storage, inserta la fila en `laboratorios` (`estado = 'pendiente_revision'`) e intenta parsear valores, en ese orden, con el parseo como último paso *best-effort* (un fallo ahí nunca deshace la subida ni el registro). Nota de infra: subir un PDF/foto desde una Server Action necesitó subir `experimental.serverActions.bodySizeLimit` en `next.config.ts` (default de Next es 1MB).

**Parseo automático** (`src/lib/laboratorios/parsear.ts`): solo PDF con capa de texto (extraída con `unpdf`, sin dependencias nativas — se evitó `pdf-parse` por su footgun conocido en entornos serverless). Expresiones regulares simples por analito (glucosa, colesterol total, HDL, LDL, triglicéridos, hierro, vitamina D, TSH, creatinina, urea, hemoglobina, hematocrito) — sin OCR: una imagen escaneada queda con `valores = {}` para carga manual. Deliberado, no una limitación a resolver — ver el prompt original que pidió esto explícitamente.

**Validación humana obligatoria**: un laboratorio recién subido es `pendiente_revision`; el profesional lo valida o rechaza desde la ficha del paciente (`/app/pacientes/[id]`), pudiendo corregir cualquier valor que el parseo haya detectado mal o cargarlos a mano si no detectó nada. Solo `validado` habilita usar esos valores como input de un plan generado con IA (ver §10).

**RLS nota de diseño**: el paciente tiene una policy de `UPDATE` sobre su propio laboratorio mientras siga `pendiente_revision` (la usa el parseo automático para guardar `valores` justo después de subir). Esa policy no restringe columna por columna — un cliente que arme el request a mano podría reescribir `notas_profesional` de su propio laboratorio pendiente. Riesgo aceptado para v1 (no puede validarlo ni tocar otros pacientes); si hace falta cerrarlo, la solución es un trigger que bloquee cambios a esa columna desde el lado paciente.

**Bandeja de hoy**: nueva regla (`src/lib/queries/laboratorios.ts`) — laboratorios `pendiente_revision` hace más de 48hs, prioridad MEDIA.

## 10. Generación de plan alimentario con IA

`src/lib/ai/generar-plan.ts` — única función que habla con la API de Anthropic (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY` server-side, `import "server-only"` para que un import accidental desde un Client Component rompa el build en vez de filtrar la key). Modelo `claude-opus-5` (default de la política del equipo: no bajar de calidad por costo sin que lo pida quien paga la cuenta — el costo real es bajo para este uso, un plan por vez, no una conversación).

**Salida estructurada, no texto libre**: se usa `client.messages.parse()` con un schema Zod (`output_config.format`, vía el helper `zodOutputFormat`) — la API garantiza que `response.parsed_output` matchea el schema (resumen + 7 días × comidas + nota opcional por día + consideraciones de laboratorio), no hay que parsear/validar texto a mano. El resultado estructurado se convierte a markdown legible (`formatearComoMarkdown`) y **eso** es lo que se guarda en `planes.contenido` — se eligió no agregar una columna jsonb paralela para no duplicar la fuente de verdad; el profesional edita el markdown como texto libre en el editor, no la estructura.

**Nunca se envía sin pasar por la revisión humana**: `planes.estado` va `borrador_ia` (recién generado) → `editado_manual` (el profesional guardó, haya cambiado algo o no) → `enviado` (`enviado_at` seteado, recién ahí lo ve el paciente — la policy `planes_select_paciente` ya filtraba por `enviado_at is not null` desde antes de que existiera IA, así que no hizo falta tocar RLS para esto). Las tres transiciones viven en una sola Server Action cada una (`generarPlanIA`, `guardarPlan` en `src/app/app/pacientes/[id]/planes-actions.ts`) — no hay ningún camino de código que setee `estado = 'enviado'` fuera de una llamada explícita del profesional a "Enviar al paciente".

**Input al modelo**: nombre/edad del paciente, notas del profesional (si las hay), última medición (peso), y el laboratorio **validado** más reciente — nunca uno `pendiente_revision` o `rechazado`; si no hay ninguno validado, el prompt se lo dice explícitamente al modelo en vez de omitirlo en silencio, para que no lo de por hecho.

**Manejo de errores**: cadena de `instanceof` más-específico-primero (`RateLimitError` → `AuthenticationError` → `APIConnectionTimeoutError` → `APIError` genérico), cada uno con mensaje en español y un flag `reintentable`. El profesional siempre puede reintentar o directamente empezar a escribir el plan a mano — la IA nunca es la única vía.

**Verificación**: se corrió `generarPlanConIA` contra la API real (con un paciente/laboratorio de prueba, sin persistir nada) antes de dar la feature por terminada — confirmó que el modelo efectivamente ajusta el plan según los valores de laboratorio pasados (hierro bajo → más hierro hemo/no-hemo + vitamina C; LDL alto → menos grasa saturada, más fibra), no solo que la llamada a la API no tira error.
