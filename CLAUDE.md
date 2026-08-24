# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Fase 2: Supabase real + schema aplicado + código de auth end-to-end escrito. Falta la prueba manual real con una cuenta de Google, y ninguna pantalla de negocio está construida todavía (solo placeholders post-login).** `apps/web/` es Next.js 16 (Turbopack, App Router) — build y lint limpios. shadcn/ui en estilo `base-nova` (`@base-ui/react`, no Radix — composición con `render` prop, no `asChild`). Paleta tinte violeta en `globals.css` (`--primary`/`--ring`/`--sidebar-primary`) como placeholder — falta ajustar con las capturas reales del Stitch export que menciona el PRD original (no se recibieron en esta sesión).

**Supabase está vivo**: proyecto ref `mgscprkbdbwejfhvkggm` (región `us-east-1`), URL `https://mgscprkbdbwejfhvkggm.supabase.co`. Las 3 migraciones están **aplicadas y verificadas**: 10 tablas, RLS habilitado en las 10, 5 funciones (`auth_profesional_id`, `auth_paciente_id`, `invitar_paciente`, `aceptar_invitacion`, `confirmar_turno`). Aplicadas vía `psql` por el session pooler (`aws-0-us-east-1.pooler.supabase.com:5432`, user `postgres.mgscprkbdbwejfhvkggm`) — no hay Supabase CLI instalado, `psql` viene de `libpq` sin linkear al PATH (`find /opt/homebrew/Cellar/libpq -name psql` si cambia la versión). No re-aplicar sin chequear el estado actual del proyecto primero.

Credenciales en `.env.local` (raíz, gitignored; `apps/web/.env.local` es symlink) — cargadas. Google provider activado en Supabase Auth y redirect URI agregado en Google Cloud Console (confirmado por el usuario, no verificable desde acá sin acceso a esos dashboards).

**Código de auth escrito y probado en build/dev, pero sin probar el round-trip real de Google todavía** (`npm run build`/`lint` limpios; `curl` confirmó que el proxy redirige correctamente `/`, `/app`, `/onboarding` → `/login?next=...` sin sesión — lo que no se pudo probar desde acá es el consent screen real de Google, que requiere un browser interactivo):
- `src/lib/supabase/{client,server}.ts` — clientes Supabase estándar SSR.
- `src/lib/dal.ts` — `getSession()`, `resolveRole()` (resuelve `profesional` / `paciente` / `sin_rol` en una sola query paralela, cacheada por request), `getAuthorizedProfesional()`/`getAuthorizedPaciente()` (guards de `/app` y `/portal`, redirigen cruzado si el rol no matchea en vez de rechazar — ver la nota en el archivo sobre por qué esto difiere del patrón allowlist de un proyecto de un solo tenant).
- `src/proxy.ts` — check optimista de cookie de sesión únicamente (sin query a rol), igual patrón que Raíces del Sur.
- `src/app/login/` — botón Google, forwardea `?next=` a través del callback.
- `src/app/auth/callback/route.ts` — solo intercambia el code, no decide rol (eso es `/` + `resolveRole()`).
- `src/app/onboarding/` — chooser (tabs) profesional/paciente; `actions.ts` tiene las dos Server Actions (`altaProfesional`, `aceptarInvitacionInput`); `invitacion/[token]/page.tsx` es el link directo que se le manda al paciente (auto-acepta si ya hay sesión).
- `src/app/app/` y `src/app/portal/` — layouts con la guard correspondiente + página placeholder que confirma el nombre del usuario logueado. **Acá se corta el trabajo de esta sesión** — Bandeja de hoy, pacientes, agenda, chat, planes, cobros y el resto del portal paciente no están construidos.

**Próximo paso real**: el usuario prueba el login con su cuenta de Google real en el browser (`npm run dev`, tanto el flujo de alta de profesional como —con una segunda cuenta de test— el flujo de invitación de paciente vía `invitar_paciente` desde el SQL editor de Supabase para generar un link de prueba). Una vez confirmado que anda de punta a punta, seguir con `docs/architecture.md` §5 y el roadmap: CRUD pacientes + agenda → Bandeja de hoy real → resto del portal paciente → chat + cobros + envío de planes.

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
