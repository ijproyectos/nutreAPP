# NutrIA

SaaS multi-tenant para nutricionistas en LATAM: pacientes, agenda, planes alimentarios, cobros y una "Bandeja de hoy" que prioriza qué paciente necesita atención cada día.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS 4 + shadcn/ui (`base-nova`)
- Supabase (Postgres, Auth con Google OAuth, Row Level Security)
- Deploy: Vercel

## Estructura

```text
docs/
  product.md            # visión, usuarios, alcance de v1
  requirements.md        # RF-xxx por módulo
  architecture.md         # stack, RLS, auth, flujos críticos, infra
  data-model.md            # entidades y campos
  product-prd-original.md  # PRD/MVP original tal cual se recibió
  prompt-original.md        # prompt original tal cual se recibió

supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_rpc_funciones.sql
  seed.sql

apps/web/    # Next.js app
```

## Estado

Ver `CLAUDE.md` para el estado actual del proyecto y qué falta.

## Correr localmente

```bash
cd apps/web
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Supabase

1. Crear el proyecto en [supabase.com](https://supabase.com).
2. Aplicar en orden `supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_rpc_funciones.sql`.
3. Copiar las credenciales a `apps/web/.env.local` (ver `.env.example`).
4. Configurar el proveedor Google en Supabase Auth (Authentication → Providers → Google) con el Client ID/Secret de Google Cloud Console.
5. En Google Cloud Console, configurar el OAuth consent screen — ver la nota de verificación en `docs/architecture.md` §4 antes de invitar pacientes reales.
