# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Fase 1: Supabase real y schema aplicado. Falta terminar de conectar Google OAuth y escribir el código de auth — ninguna pantalla está construida todavía.** `apps/web/` es un Next.js 16 (Turbopack, App Router) recién scaffoldeado — build y lint limpios, sin páginas propias todavía (solo el default de `create-next-app`). shadcn/ui instalado en estilo `base-nova` (mismo criterio que Raíces del Sur: `@base-ui/react`, no Radix — composición trigger/select/dialog con `render` prop, no `asChild`).

**Supabase está vivo**: proyecto ref `mgscprkbdbwejfhvkggm` (región `us-east-1`), URL `https://mgscprkbdbwejfhvkggm.supabase.co`. Las 3 migraciones (`supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_rpc_funciones.sql`) están **aplicadas y verificadas**: 10 tablas, RLS habilitado en las 10, 5 funciones (`auth_profesional_id`, `auth_paciente_id`, `invitar_paciente`, `aceptar_invitacion`, `confirmar_turno`). Aplicadas vía `psql` por el session pooler (`aws-0-us-east-1.pooler.supabase.com:5432`, user `postgres.mgscprkbdbwejfhvkggm`) — mismo mecanismo que Raíces del Sur; no hay Supabase CLI instalado, `psql` viene de `libpq` sin linkear al PATH (`find /opt/homebrew/Cellar/libpq -name psql` si cambia la versión). No re-aplicar sin chequear el estado actual del proyecto primero.

Credenciales en `.env.local` (raíz, gitignored; `apps/web/.env.local` es symlink) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ya cargadas.

**Falta antes de escribir el código de auth:**
1. Confirmar que el usuario ya activó el provider de Google en Supabase (Authentication → Providers → Google, con el Client ID/Secret de Google Cloud Console) y agregó el redirect URI `https://mgscprkbdbwejfhvkggm.supabase.co/auth/v1/callback` en Google Cloud Console — son pasos de dashboard, no verificables desde acá sin credenciales de esos paneles.
2. Verificación de la app OAuth en Google (consent screen) — **NutrIA difiere del patrón de un proyecto de un solo tenant**: no alcanza con "Testing" + allowlist, va a haber pacientes reales de terceros. Trámite con lead time de días/semanas (ver `docs/architecture.md` §4) — se puede seguir desarrollando con test users mientras tanto, pero no lanzar con pacientes reales hasta que esté verificada.

Después de confirmar el punto 1, escribir el código de auth (`login`, `onboarding`, `callback`, `proxy.ts`) y seguir con el orden de `docs/architecture.md` §5 (flujos críticos) y el roadmap original: CRUD pacientes + agenda → Bandeja de hoy + portal paciente (login, ver turno, ver plan) → chat + cobros + envío de planes.

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
