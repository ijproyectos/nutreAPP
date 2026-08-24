# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Fase 0: setup del proyecto + esquema completado. Supabase todavía no existe, Google OAuth todavía no está configurado, ninguna pantalla está construida.** `apps/web/` es un Next.js 16 (Turbopack, App Router) recién scaffoldeado — build y lint limpios, sin páginas propias todavía (solo el default de `create-next-app`). shadcn/ui instalado en estilo `base-nova` (mismo criterio que Raíces del Sur: `@base-ui/react`, no Radix — composición trigger/select/dialog con `render` prop, no `asChild`).

Las migraciones SQL están **escritas pero no aplicadas** (no hay proyecto Supabase todavía): `supabase/migrations/001_initial_schema.sql` (10 tablas, ver `docs/data-model.md`), `002_rls_policies.sql` (funciones helper `auth_profesional_id()`/`auth_paciente_id()` + policies en cada tabla), `003_rpc_funciones.sql` (`invitar_paciente`, `aceptar_invitacion`, `confirmar_turno`).

**Siguiente paso real, en este orden** (bloqueado por acciones manuales del usuario en dashboards externos, no por código):
1. Crear el proyecto en Supabase (dashboard) y pasar credenciales (URL, anon key, service role key, y la connection string del pooler para aplicar migraciones vía `psql`, mismo mecanismo que se usó en Raíces del Sur).
2. Aplicar `001` → `002` → `003` en ese orden vía `psql` a través del session pooler.
3. Crear credenciales OAuth de Google en Google Cloud Console (Client ID + Secret) y cargarlas en Supabase Auth → Providers → Google.
4. Configurar el consent screen — **acá NutrIA difiere del patrón de un proyecto de un solo tenant**: no alcanza con "Testing" + allowlist de test users, porque va a haber pacientes reales de terceros. Hay que iniciar el trámite de verificación de la app OAuth en paralelo (lead time de días/semanas — ver `docs/architecture.md` §4). Mientras tanto se puede desarrollar con test users igual que cualquier app en Testing.
5. Recién ahí tiene sentido escribir el código de auth (`login`, `onboarding`, `callback`, `proxy.ts`) porque hace falta un proyecto real contra el que probar.

Después de eso, construir en el orden que marca `docs/architecture.md` §5 (flujos críticos) y el roadmap original: auth + esquema → CRUD pacientes + agenda → Bandeja de hoy + portal paciente (login, ver turno, ver plan) → chat + cobros + envío de planes.

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
