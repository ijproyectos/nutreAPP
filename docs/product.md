# Producto — NutrIA

## Qué es

NutrIA es un SaaS multi-tenant para nutricionistas en LATAM que centraliza la gestión del consultorio: pacientes, agenda, planes alimentarios, seguimiento de adherencia, cobros y comunicación. El diferencial frente a una agenda genérica es la **"Bandeja de hoy"**: un feed de alertas priorizadas que le dice al profesional, todos los días, qué pacientes necesitan atención (sin turno agendado, pagos pendientes, sin confirmar) para reducir el abandono de pacientes.

Dos lados de producto:
- **Lado profesional**: dashboard, pacientes, agenda, chat, planes, cobros.
- **Lado paciente**: ver su plan, registrar comidas/peso, confirmar turnos, chatear con su nutricionista.

## Usuarios

| Rol | Descripción |
|---|---|
| Profesional (nutricionista) | Dueño de la cuenta (tenant). Se da de alta solo (self-serve), sin allowlist. |
| Paciente | Invitado por un profesional vía email; solo puede loguearse si fue invitado. |
| Admin NutrIA (interno) | Fuera de alcance del MVP — soporte/facturación de cuentas profesionales. No se construye en v1. |

Modelo multi-tenant: cada profesional es un tenant con sus propios pacientes, agenda y contenido, aislados entre sí por Row Level Security (ver `docs/architecture.md` §RLS).

## Objetivos del MVP (v1)

Un flujo end-to-end funcionando de punta a punta, con ambos lados construidos:

1. Un profesional se registra con Google, invita a un paciente.
2. El paciente acepta la invitación con Google, ve su próximo turno y su plan.
3. El profesional agenda turnos, ve su Bandeja de hoy con alertas reales, registra cobros.
4. Ambos se comunican por chat dentro de la plataforma.

## Fuera de alcance de v1 (decisión explícita, ver detalle en `docs/requirements.md` y `docs/architecture.md`)

- Cobro online (Mercado Pago / Stripe) — el flujo de cobro queda manual (profesional marca "cobrado").
- Facturación SaaS de NutrIA al profesional (suscripciones) — no hay planes pagos todavía.
- WhatsApp para recordatorios — solo alertas visibles en la Bandeja de hoy, sin envío automático.
- Recordatorios automáticos por cron — el reenvío de recordatorio es una acción manual del profesional en v1.
- Upload de archivos en planes (PDF) — los planes son texto/markdown en v1.
- Importación masiva de pacientes (CSV) — solo alta manual.
- Auditoría de accesos/cambios — se pospone.
- Base de alimentos con macros / armador de planes por macros.
- Videollamada integrada.
- App mobile nativa (queda como responsive web).
- Panel de administración interno de NutrIA.

## Requisitos no funcionales clave

- **Multi-tenancy con aislamiento de datos** (RLS) — información de salud, sensible.
- **Login con Google (OAuth 2.0)** para ambos roles.
- **Cumplimiento**: Ley 25.326 de Protección de Datos Personales (Argentina) — cifrado en tránsito/reposo (dado por Supabase), política de privacidad y consentimiento informado antes de cargar pacientes reales.
- **Backups automáticos** de la base (dados por Supabase).

Ver `docs/requirements.md` para el detalle funcional (RF-xxx) y `docs/architecture.md` para el diseño técnico.
