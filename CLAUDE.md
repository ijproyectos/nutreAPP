# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Fase 4: login probado en vivo + shell/dashboard/pacientes + laboratorios clínicos (modelo de datos + carga, sin la generación de plan con IA todavía — parada deliberada, ver abajo).** `apps/web/` es Next.js 16 (Turbopack, App Router) — build y lint limpios. shadcn/ui en estilo `base-nova` (`@base-ui/react`, no Radix — composición con `render` prop, no `asChild`).

**Laboratorios clínicos** (agregado post-v1, no estaba en el PRD original — ver `docs/architecture.md` §9 y `docs/requirements.md` RF-084/085/090/091 para el detalle):
- `supabase/migrations/004_laboratorios.sql` — tabla `laboratorios` + RLS + bucket privado de Storage (`laboratorios`) + policies de `storage.objects`. **Aplicada y verificada** (mismo mecanismo `psql`/pooler).
- `src/lib/laboratorios/parsear.ts` — extracción de texto de PDF con `unpdf` (sin OCR, sin dependencias nativas) + regex simples por analito. Nunca lanza — si falla, `valores = {}`.
- `src/app/portal/laboratorios/` — el paciente sube el archivo (Server Action `subirLaboratorio`: upload a Storage + insert + intento de parseo, todo en un solo paso; subió `experimental.serverActions.bodySizeLimit` a 15mb en `next.config.ts` porque el default de 1MB no alcanza para un PDF/foto) y ve su propio listado con estado.
- `src/app/app/pacientes/[id]/` — **ficha de paciente nueva** (no existía antes de esto — RF-022 solo estaba especificada, no construida). Por ahora solo tiene la sección Laboratorios: revisar/editar valores/validar/rechazar. El resto de la ficha (historial de turnos, mediciones) queda para cuando se necesite.
- Bandeja de hoy: nueva alerta (`src/lib/queries/laboratorios.ts`) — laboratorios `pendiente_revision` hace más de 48hs.
- Trade-off de RLS documentado (no un bug): el paciente puede reescribir `notas_profesional` de su propio laboratorio mientras siga pendiente — ver la nota en `004_laboratorios.sql` y en `docs/architecture.md` §9 antes de "corregirlo" sin releer por qué se aceptó así.

**Pendiente, explícitamente pausado a pedido del usuario**: generación de plan nutricional con IA (Anthropic API) + edición manual del borrador — ver el prompt que agregó laboratorios para el spec completo (tabla `planes` ampliada con `estado`/`generado_con_ia`/`laboratorio_id`, `lib/ai/generar-plan.ts`, botón "Generar plan con IA" en la ficha del paciente). No arrancar esto sin confirmación — es la continuación explícitamente acordada, no algo ya en curso.

**Paleta y tipografía ya son las del diseño real** (no un placeholder): sidebar violeta/ciruela oscuro (`--sidebar`), fondo crema (`--background`), acento naranja/coral (`--accent`, `--destructive` para prioridad ALTA), heading serif con Google Font Lora (`--font-heading`, aplicado a h1/h2/h3 vía `@layer base`) — todo en `globals.css`. Los valores se estimaron a ojo de las capturas (no hay extractor de color exacto) — si algo se ve desalineado con el diseño original, es candidato a ajuste fino, no a rediseño.

**Pantallas construidas** (`src/app/app/`):
- `components/app-shell.tsx` — sidebar fijo con nav (Inicio/Pacientes/Agenda/Chats + sección Contenido: Planes/Alimentos/Recursos/Formularios + Configuración), estado activo por ruta, menú de usuario (dropdown) con logout.
- `/app` (Bandeja de hoy, RF-040/041) — alertas reales calculadas con queries, no hardcodeadas: pacientes activos sin próximo turno, turnos pendientes en las próximas 48h, cobros pendientes. **Deliberadamente NO muestra** adherencia/recuperados ni la alerta de "sin registrar comidas" del mockup — necesitan historial de `mediciones`/`registros_comida` que todavía no existe; se documentó como nota visible en el panel de métricas en vez de fabricar números. Métricas reales: % continuidad, $ por cobrar. Agenda de hoy con brief de continuidad (de `consultas`, solo si existe una fila real). Actividad reciente combina `mediciones`/`planes.enviado_at`/`turnos.created_at` (no incluye "turno confirmado" porque el schema no registra cuándo cambió el estado, solo cuándo se creó la fila).
- `/app/pacientes` (RF-020/021) — listado con búsqueda/filtros por query params (`?q=&estado=&sin_turno=`), banner de alerta reusando la misma query que la Bandeja de hoy (`lib/queries/pacientes.ts`), diálogo "Nuevo paciente" que llama a la RPC `invitar_paciente` y muestra el link de invitación para copiar (sin envío de email automático todavía).
- `/app/{agenda,chats,planes,alimentos,recursos,formularios,configuracion,cobros}` — stubs "Próximamente" (`components/proximamente.tsx`) para que ningún link del nav ni de la Bandeja de hoy dé 404.

**Notas de lint que importan para código futuro en este repo**: eslint-config-next trae las reglas nuevas de React Compiler (`react-hooks/purity`, `react-hooks/set-state-in-effect`). No usar `Date.now()`/`Math.random()` en el cuerpo de un Server Component — usar `new Date()` (sí lo tolera, ver `src/lib/queries/*.ts` y `src/lib/format.ts` para el patrón). No hacer `setState` directo dentro de un `useEffect` — mover la lógica al handler que dispara el cambio (ver `nuevo-paciente-dialog.tsx`). No usar `window.location.href` para navegación interna — `useRouter()` de `next/navigation`.

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

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4 + shadcn/ui (`base-nova`) + Lucide icons, sobre Supabase (Postgres, Auth, Row Level Security — Storage recién en fase 2), hosted on Vercel. Validación con Zod + React Hook Form. Server Components para lectura; TanStack Query solo donde haga falta cache/mutación del lado del cliente (ej. chat).

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
- Env vars (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. La service role key nunca se expone al frontend.
