# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Fase 6: todo lo de la Fase 5 (login en vivo, shell/dashboard/pacientes, laboratorios, plan con IA) + listo para deploy en Netlify.** `apps/web/` es Next.js 16 (Turbopack, App Router) — build y lint limpios. shadcn/ui en estilo `base-nova` (`@base-ui/react`, no Radix — composición con `render` prop, no `asChild`). `netlify.toml` en la raíz (mismo patrón monorepo de Raíces del Sur — `base = "apps/web"`, `publish = ".next"` explícito). Falta: crear el sitio en Netlify, conectar el repo de GitHub y cargar las 4 env vars ahí — eso es acción del usuario, no verificable desde acá.

**Laboratorios clínicos** (agregado post-v1, no estaba en el PRD original — ver `docs/architecture.md` §9 y `docs/requirements.md` RF-084/085/090/091 para el detalle):
- `supabase/migrations/004_laboratorios.sql` — tabla `laboratorios` + RLS + bucket privado de Storage (`laboratorios`) + policies de `storage.objects`. **Aplicada y verificada** (mismo mecanismo `psql`/pooler).
- `src/lib/laboratorios/parsear.ts` — extracción de texto de PDF con `unpdf` (sin OCR, sin dependencias nativas) + regex simples por analito. Nunca lanza — si falla, `valores = {}`.
- `src/app/portal/laboratorios/` — el paciente sube el archivo (Server Action `subirLaboratorio`: upload a Storage + insert + intento de parseo, todo en un solo paso; subió `experimental.serverActions.bodySizeLimit` a 15mb en `next.config.ts` porque el default de 1MB no alcanza para un PDF/foto) y ve su propio listado con estado.
- `src/app/app/pacientes/[id]/` — **ficha de paciente nueva** (no existía antes de esto — RF-022 solo estaba especificada, no construida). Tiene las secciones Historia clínica, Laboratorios (revisar/editar valores/validar/rechazar) y Plan alimentario (ver abajo).
- Bandeja de hoy: nueva alerta (`src/lib/queries/laboratorios.ts`) — laboratorios `pendiente_revision` hace más de 48hs.
- Trade-off de RLS documentado (no un bug): el paciente puede reescribir `notas_profesional` de su propio laboratorio mientras siga pendiente — ver la nota en `004_laboratorios.sql` y en `docs/architecture.md` §9 antes de "corregirlo" sin releer por qué se aceptó así.

**Generación de plan con IA** (`docs/architecture.md` §10, `docs/requirements.md` RF-062/063):
- `supabase/migrations/005_planes_ia.sql` — `planes` ganó `estado` (`borrador_ia`/`editado_manual`/`enviado`, default `editado_manual`), `generado_con_ia`, `laboratorio_id`. **Aplicada y verificada.**
- `src/lib/ai/generar-plan.ts` — único punto de contacto con la API de Anthropic (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY` en `.env.local`, `import "server-only"`). Modelo `claude-opus-5`. Usa `client.messages.parse()` con schema Zod (`output_config.format`) para forzar salida estructurada — nunca texto libre sin validar — y esa estructura se convierte a markdown antes de guardarse en `planes.contenido` (no hay columna jsonb paralela). **Verificado contra la API real** (no solo compilado): confirmé que el plan generado efectivamente ajusta según los valores de laboratorio pasados, no solo que la llamada no tira error.
- `src/app/app/pacientes/[id]/planes-actions.ts` + `plan-ia-panel.tsx` — "Generar plan con IA" (usa el laboratorio **validado** más reciente, nunca uno pendiente/rechazado) → `borrador_ia`; el profesional edita el texto libremente y "Guardar borrador" (`editado_manual`) o "Enviar al paciente" (`enviado`, recién ahí lo ve el paciente). Ningún camino de código salta directo a `enviado` sin pasar por esta pantalla.
- `src/app/portal/plan/page.tsx` — RF-061, el paciente ve su plan vigente (la policy RLS `planes_select_paciente` ya filtraba por `enviado_at is not null` desde antes de que existiera IA).
- Ya no hay gap: además de "Generar plan con IA", la ficha tiene "Escribir manualmente" (`crearPlanManual` en `planes-actions.ts`) — crea el plan directo en `editado_manual`, sin pasar por la IA (RF-060).
- Bug real corregido (reportado por el usuario: "genero el plan y no pasó nada"): `PlanIAPanel` es client component con `useState(planActivo?.contenido ?? "")` para el texto editable. Sin un `key` en el `<PlanIAPanel>` de `page.tsx`, React reusaba la misma instancia al pasar de "sin plan" a "con plan recién generado" — la acción sí insertaba el plan y `revalidatePath` sí traía el `planActivo` nuevo, pero el `useState` local quedaba pisado en `""` (su valor inicial, que solo se lee en el mount), así que el textarea se veía vacío y parecía que no había pasado nada. Fix: `key={planActivo?.id ?? "sin-plan"}` en `page.tsx` para forzar remount cuando cambia la identidad del plan.

**Historia clínica** (RF-022, completa la ficha de paciente — pedido explícito del usuario, antes solo estaban Laboratorios y Plan):
- `supabase/migrations/007_historia_clinica.sql` — agrega `pacientes.notas_generales` (única columna nueva; `mediciones` y `turnos` ya tenían tabla + RLS desde 001/002, solo faltaba UI). **Pendiente de aplicar contra la DB en vivo** — a diferencia de las migraciones anteriores, esta todavía no está confirmada como aplicada, avisar antes de asumirlo.
- `src/app/app/pacientes/[id]/historia-clinica-panel.tsx` + `historia-actions.ts` — tres bloques: Mediciones (form para cargar peso + lista con delta vs. la medición anterior + sparkline SVG dibujado a mano, sin librería de gráficos), Historial de turnos (solo lectura — vacío hasta que exista Agenda, no hay CRUD de turnos todavía), Notas (textarea libre del profesional).
- **Trade-off de RLS documentado en la migración** (mismo patrón que `laboratorios.notas_profesional`): `notas_generales` es legible por el propio paciente a nivel de policy (`pacientes_select_self` es de fila completa, no filtra columnas) — la barrera es de capa de aplicación: ninguna query de `src/app/portal/**` selecciona esa columna. Si en algún momento hace falta la garantía a nivel de DB, la solución es una tabla aparte, no una policy de columna (Postgres no las tiene nativas).
- Mismo bug de key que `PlanIAPanel` evitado a propósito: el form de "agregar medición" usa `key={mediciones.length}` para resetearse solo cuando la lista realmente creció (mismo criterio, no un afterthought).

**Paleta y tipografía ya son las del diseño real** (no un placeholder): sidebar violeta/ciruela oscuro (`--sidebar`), fondo crema (`--background`), acento naranja/coral (`--accent`, `--destructive` para prioridad ALTA), heading serif con Google Font Lora (`--font-heading`, aplicado a h1/h2/h3 vía `@layer base`) — todo en `globals.css`. Los valores se estimaron a ojo de las capturas (no hay extractor de color exacto) — si algo se ve desalineado con el diseño original, es candidato a ajuste fino, no a rediseño.

**Pantallas construidas** (`src/app/app/`):
- `components/app-shell.tsx` — sidebar fijo con nav (Inicio/Pacientes/Agenda/Chats + sección Contenido: Planes/Alimentos/Recursos/Formularios + Configuración), estado activo por ruta, menú de usuario (dropdown) con logout.
- `/app` (Bandeja de hoy, RF-040/041) — alertas reales calculadas con queries, no hardcodeadas: pacientes activos sin próximo turno, turnos pendientes en las próximas 48h, cobros pendientes. **Deliberadamente NO muestra** adherencia/recuperados ni la alerta de "sin registrar comidas" del mockup — necesitan historial de `mediciones`/`registros_comida` que todavía no existe; se documentó como nota visible en el panel de métricas en vez de fabricar números. Métricas reales: % continuidad, $ por cobrar. Agenda de hoy con brief de continuidad (de `consultas`, solo si existe una fila real). Actividad reciente combina `mediciones`/`planes.enviado_at`/`turnos.created_at` (no incluye "turno confirmado" porque el schema no registra cuándo cambió el estado, solo cuándo se creó la fila).
- `/app/pacientes` (RF-020/021) — listado con búsqueda/filtros por query params (`?q=&estado=&sin_turno=`), banner de alerta reusando la misma query que la Bandeja de hoy (`lib/queries/pacientes.ts`), diálogo "Nuevo paciente" que llama a la RPC `invitar_paciente` y muestra el link de invitación para copiar + botón "Enviar por WhatsApp" (`wa.me`/`api.whatsapp.com`, con el teléfono cargado si hay o dejando elegir el contacto si no) — es el canal principal de invitación, no mail (ver más abajo por qué).
- `/app/{agenda,chats,planes,alimentos,recursos,formularios,configuracion,cobros}` — stubs "Próximamente" (`components/proximamente.tsx`) para que ningún link del nav ni de la Bandeja de hoy dé 404.

**Invitación a paciente por WhatsApp, no por mail** (RF-020): se probó el envío automático por Resend y falló contra un paciente real — confirmado contra la API real (no solo compilado) que la cuenta de Resend está en modo sandbox y solo entrega al email dueño de la cuenta (`ijproyectos26@gmail.com`), a cualquier otro destinatario le devuelve 403 sin dominio verificado. Se sacó el envío de mail de `crearPaciente` (`pacientes/actions.ts`) y en su lugar `nuevo-paciente-dialog.tsx` tiene un botón "Enviar por WhatsApp" (`wa.me`/`api.whatsapp.com`) al lado del link para copiar. Si se verifica un dominio propio en Resend en el futuro, volver a esto es directo — el criterio "nunca lanza" de `src/lib/email/enviar.ts` sigue ahí.

**Email transaccional con Resend** (queda solo para RF-042, recordatorio manual de turno — `docs/architecture.md` §, sección "Email transaccional"):
- `src/lib/email/enviar.ts` — único punto de contacto con `resend` (`RESEND_API_KEY` en `.env.local`, `import "server-only"`). Mismo criterio "nunca lanza" que `src/lib/laboratorios/parsear.ts`: si el envío falla, devuelve `{ enviado: false, error }` en vez de tirar.
- `app/recordatorio-actions.ts` + `app/recordar-turno-button.tsx` — botón "Recordar a {paciente}" por turno sin confirmar, directo en la Bandeja de hoy (alerta de "turnos sin confirmar en las próximas 48h"). El turno se relee server-side por RLS antes de mandar el mail — no confía en lo que venga del form.
- **Mismo límite de sandbox que la invitación** (ver arriba): un recordatorio a un paciente real también va a fallar hasta que se verifique un dominio en Resend. Queda como está (no se pidió moverlo a WhatsApp) — si hace falta, mismo criterio que la invitación.

**Notas de lint que importan para código futuro en este repo**: eslint-config-next trae las reglas nuevas de React Compiler (`react-hooks/purity`, `react-hooks/set-state-in-effect`). No usar `Date.now()`/`Math.random()` en el cuerpo de un Server Component — usar `new Date()` (sí lo tolera, ver `src/lib/queries/*.ts` y `src/lib/format.ts` para el patrón). No hacer `setState` directo dentro de un `useEffect` — mover la lógica al handler que dispara el cambio (ver `nuevo-paciente-dialog.tsx`). No usar `window.location.href` para navegación interna — `useRouter()` de `next/navigation`. `<Button render={<Link .../>}>` (o cualquier `render` que no sea un `<button>` de verdad, ej. `<a>`/`Link`) necesita `nativeButton={false}` explícito — sin eso Base UI tira un console error en runtime ("expected a native <button>"), no se detecta en build/lint (bug real encontrado en `auth-code-error/page.tsx` y `onboarding/invitacion/[token]/page.tsx`, corregido).

**Supabase está vivo**: proyecto ref `mgscprkbdbwejfhvkggm` (región `us-east-1`), URL `https://mgscprkbdbwejfhvkggm.supabase.co`. Las 3 migraciones están **aplicadas y verificadas**: 10 tablas, RLS habilitado en las 10, 5 funciones (`auth_profesional_id`, `auth_paciente_id`, `invitar_paciente`, `aceptar_invitacion`, `confirmar_turno`). Aplicadas vía `psql` por el session pooler (`aws-0-us-east-1.pooler.supabase.com:5432`, user `postgres.mgscprkbdbwejfhvkggm`) — no hay Supabase CLI instalado, `psql` viene de `libpq` sin linkear al PATH (`find /opt/homebrew/Cellar/libpq -name psql` si cambia la versión). No re-aplicar sin chequear el estado actual del proyecto primero.

Credenciales en `.env.local` (raíz, gitignored; `apps/web/.env.local` es symlink) — cargadas. Google provider activado en Supabase Auth y redirect URI agregado en Google Cloud Console (confirmado por el usuario, no verificable desde acá sin acceso a esos dashboards).

**Código de auth** (`npm run build`/`lint` limpios, y el usuario confirmó que el login con Google funciona en vivo — incluyó resolver un `redirect_uri_mismatch` corrigiendo el Authorized redirect URI en Google Cloud Console):
- `src/lib/supabase/{client,server}.ts` — clientes Supabase estándar SSR.
- `src/lib/dal.ts` — `getSession()`, `resolveRole()` (resuelve `profesional` / `paciente` / `sin_rol` en una sola query paralela, cacheada por request), `getAuthorizedProfesional()`/`getAuthorizedPaciente()` (guards de `/app` y `/portal`, redirigen cruzado si el rol no matchea en vez de rechazar — ver la nota en el archivo sobre por qué esto difiere del patrón allowlist de un proyecto de un solo tenant).
- `src/proxy.ts` — check optimista de cookie de sesión únicamente (sin query a rol), igual patrón que Raíces del Sur.
- `src/app/login/` — botón Google, forwardea `?next=` a través del callback.
- `src/app/auth/callback/route.ts` — solo intercambia el code, no decide rol (eso es `/` + `resolveRole()`).
- `src/app/onboarding/` — chooser (tabs) profesional/paciente; `actions.ts` tiene las dos Server Actions (`altaProfesional`, `aceptarInvitacionInput`); `invitacion/[token]/page.tsx` es el link directo que se le manda al paciente (auto-acepta si ya hay sesión).
- `src/app/portal/` — layout con la guard + página placeholder. **El portal paciente sigue sin construir** — es el próximo bloque grande de trabajo (RF-080/081/082/083).

**Próximo paso real**: Agenda (RF-030/031/032) — la Bandeja de hoy y Pacientes ya linkean a `/app/agenda` y usan datos de `turnos`, pero la pantalla en sí (crear/editar/cancelar turno, calendario/lista) todavía es un stub. Después: resto del portal paciente, chat, planes (texto), cobros.

## Qué es

NutrIA es un SaaS multi-tenant para nutricionistas en LATAM (self-serve: cualquiera se da de alta como profesional, sin allowlist) que centraliza pacientes, agenda, planes alimentarios, cobros y comunicación, con una "Bandeja de hoy" que prioriza alertas de continuidad. Dos frontales en el mismo Next.js app: panel profesional (`/app/*`) y portal paciente (`/portal/*`), separados por `proxy.ts` según a qué tabla pertenece el usuario logueado (`profesionales` vs `pacientes.user_id`).

Doc completo: `docs/product.md`. Requisitos funcionales (RF-xxx): `docs/requirements.md`. Esto fue armado a partir de un PRD/MVP entregado por el usuario (`docs/product-prd-original.md` y `docs/prompt-original.md`, conservados tal cual como referencia histórica) con una serie de recortes de alcance deliberados para v1 — están explicados con el porqué en `docs/product.md` y `docs/architecture.md` §6, no re-litigar sin revisar esa sección primero.

## Decisiones que difieren del PRD original (y por qué)

- **`profesional_id` denormalizado en toda tabla de negocio**, aunque también tenga `paciente_id` (`consultas`, `mediciones`, `registros_comida`) — el PRD original no lo tenía; se agregó para evitar policies RLS con subqueries anidadas.
- **`pacientes.user_id` en vez de una tabla de mapeo aparte** — el prompt original mencionaba una tabla `user_id -> paciente_id`; para MVP (1 paciente = 1 cuenta) alcanza una columna.
- **Alta de profesional self-serve, sin allowlist** — a diferencia de otros proyectos de un solo tenant, acá es el modelo de negocio: cualquiera se registra como profesional. El paciente sí sigue gateado por invitación (nunca se autorregistra).
- **Sin monorepo real** — el PRD lo sugería; no hace falta porque no hay backend propio, solo Supabase.
- Recortes de alcance para v1 (recordatorios manuales en vez de cron, planes en texto sin upload, sin CSV, sin auditoría) — confirmados con el usuario, detalle en `docs/product.md`.

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4 + shadcn/ui (`base-nova`) + Lucide icons, sobre Supabase (Postgres, Auth, Row Level Security, Storage — bucket privado `laboratorios` en uso desde v1) + Anthropic API (`claude-opus-5`), hosted on Netlify (`netlify.toml`). Validación con Zod + React Hook Form. Server Components para lectura; TanStack Query solo donde haga falta cache/mutación del lado del cliente (ej. chat).

## Running the app

```bash
cd apps/web
npm run dev      # local dev, http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

**Next.js 16**: `middleware.ts` se llama `proxy.ts` (función exportada `proxy`). Antes de escribir código de App Router que no sea un tweak chico, revisar `apps/web/node_modules/next/dist/docs/` — el training data está desactualizado para lo que cambió Next 16.

## Docs map

- `docs/product.md` — visión, usuarios, alcance de v1 y qué queda fuera (con el porqué).
- `docs/requirements.md` — RF-xxx por módulo (auth, pacientes, agenda, dashboard, chat, planes, cobros, portal paciente).
- `docs/architecture.md` — stack, estructura de rutas, multi-tenancy/RLS, auth (self-serve profesional + invitación paciente), flujos críticos (RPCs), qué se difirió y por qué, infra recomendada.
- `docs/data-model.md` — entidades, campos, relaciones, reglas de integridad.
- `docs/product-prd-original.md` / `docs/prompt-original.md` — el PRD y el prompt tal cual los entregó el usuario, sin editar. Referencia histórica, no la fuente de verdad — para eso están los 4 docs de arriba.

## Supabase layout

- `supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_rpc_funciones.sql` — escritas, **no aplicadas todavía** (no existe el proyecto Supabase). Aplicar en ese orden vía `psql` a través del session pooler cuando el proyecto exista (mismo mecanismo usado en Raíces del Sur — `db.<ref>.supabase.co` es IPv6-only e inalcanzable desde el sandbox, el pooler es el camino que funciona).
- `supabase/seed.sql` — no siembra `profesionales`/`pacientes` reales (requieren un `auth.users.id` real de un login real); tiene un ejemplo comentado para poblar pacientes de prueba una vez que exista un profesional real.
- Env vars (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (opcional, default `NutrIA <onboarding@resend.dev>`). Ninguna se expone al frontend — cargar las 6 en Netlify, no solo las 4 originales.
