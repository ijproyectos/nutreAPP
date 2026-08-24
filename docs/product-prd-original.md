# NutrIA — PRD & MVP

## 1. Contexto y visión

NutrIA es un SaaS para nutricionistas en LATAM que centraliza la gestión del consultorio: pacientes, agenda, planes alimentarios, seguimiento de adherencia, cobros y comunicación. El diferencial frente a una agenda genérica es la **"Bandeja de hoy"**: un motor de alertas que le dice al profesional, todos los días, qué pacientes necesitan atención (sin turno agendado, pagos pendientes, sin confirmar, sin registrar comidas) para reducir el abandono (churn) de pacientes.

Basado en las pantallas que ya diseñaste, el producto tiene dos lados:
- **Lado profesional** (lo que mostraste): dashboard, pacientes, agenda, chats, contenido (planes, alimentos, recursos, formularios), cobros.
- **Lado paciente** (a diseñar/construir): ver su plan, registrar comidas/peso, ver turnos, chatear con su nutricionista, pagar.

## 2. Usuarios

| Rol | Descripción |
|---|---|
| Profesional (nutricionista) | Dueño de la cuenta (tenant). Gestiona pacientes, agenda, contenido, cobros. |
| Paciente | Usuario final invitado por el profesional. Accede a su ficha, plan, turnos, chat. |
| Admin NutrIA (interno) | Superadmin para soporte, facturación de las cuentas profesionales, métricas de uso. |

Modelo: **multi-tenant** — cada profesional es un tenant con sus propios pacientes, agenda y contenido, aislados entre sí (Row Level Security).

## 3. Features — Lado Profesional

### 3.1 Dashboard / Bandeja de hoy
- Feed priorizado (Alta/Media/Baja) generado por reglas:
  - Pacientes sin próximo turno agendado (X días desde última consulta)
  - Pagos pendientes de cobro (monto, días de atraso)
  - Turnos sin confirmar (con reenvío automático de recordatorio)
  - Pacientes sin registrar comidas en N días
- Panel de métricas semanales: % continuidad, % adherencia, $ por cobrar, pacientes recuperados
- Resumen de agenda del día + actividad reciente

### 3.2 Pacientes
- Listado con búsqueda, filtros (activos/archivados/sin próximo turno)
- Alta manual + importación masiva (CSV)
- Ficha de paciente: datos, historial de consultas, mediciones, plan actual, notas
- Estado de continuidad por paciente

### 3.3 Agenda
- Calendario de turnos (presencial/videollamada)
- Estados: confirmado / pendiente / en curso / cancelado
- Recordatorios automáticos (email; WhatsApp en fase 2)
- Brief de continuidad por turno: qué se acordó, qué completó el paciente, qué cambió

### 3.4 Chats
- Mensajería 1:1 profesional-paciente dentro de la plataforma

### 3.5 Contenido
- **Planes**: armado de planes alimentarios (plantillas + personalización), envío al paciente
- **Alimentos**: base de datos de alimentos/macros (propia + catálogo base)
- **Recursos**: materiales (PDF, videos, guías) para compartir
- **Formularios**: intake forms, anamnesis, consentimientos

### 3.6 Cobros
- Registro de honorarios por consulta, estado (cobrado/pendiente)
- Recordatorio de cobro al paciente
- Reporte de "por cobrar" y "recuperados"
- (Fase 2) Cobro online integrado (link de pago)

### 3.7 Configuración
- Datos del consultorio, disponibilidad para turnos, integraciones (Google Calendar), plan de suscripción/facturación de NutrIA

## 4. Features — Lado Paciente

- Login (Google)
- Dashboard: próximo turno, plan vigente, tareas pendientes (registrar comidas/peso)
- Ver y confirmar turnos
- Ver plan alimentario y recursos compartidos
- Registrar comidas / mediciones (peso, adherencia)
- Chat con su profesional
- Ver/pagar pagos pendientes (fase 2)
- Completar formularios enviados por el profesional

## 5. Requisitos no funcionales

- **Multi-tenancy con aislamiento de datos** (RLS) — es información de salud, sensible.
- **Login con Google** para ambos roles (OAuth 2.0), obligatorio según tu pedido.
- **Facturación**: dos cosas distintas, no confundir:
  1. NutrIA cobrándole al profesional (suscripción SaaS) → Stripe Billing o Mercado Pago Suscripciones.
  2. El profesional cobrándole a sus pacientes → módulo de tracking + link de pago (fase 2).
- **Notificaciones**: email transaccional (turnos, recordatorios); WhatsApp como fase 2 (muy usado en LATAM, alto impacto en adherencia).
- **Cumplimiento**: datos de salud → cifrado en tránsito y reposo, política de privacidad, términos de servicio, consentimiento informado del paciente. En Argentina aplica la Ley 25.326 de Protección de Datos Personales.
- **Backups automáticos** de la base de datos.
- **Auditoría**: quién accedió/modificó datos de un paciente.

## 6. MVP — Checklist plano (fase 1)

### Infraestructura base
- [ ] Repo + monorepo (frontend + backend si aplica)
- [ ] Base de datos Postgres con esquema multi-tenant (RLS por `profesional_id`)
- [ ] Auth con Google OAuth (profesional y paciente, roles separados)
- [ ] Deploy automático (staging + producción)
- [ ] Storage de archivos (planes, recursos, avatares)

### Lado profesional
- [ ] Login/registro profesional (Google)
- [ ] Alta de paciente (manual)
- [ ] Listado de pacientes con filtros básicos (activos, sin próximo turno)
- [ ] Ficha de paciente (datos + historial simple)
- [ ] Agenda: crear/editar/cancelar turno, estado confirmado/pendiente
- [ ] Dashboard "Bandeja de hoy" con al menos 2 reglas activas (sin turno / turno sin confirmar)
- [ ] Registro manual de cobro por consulta (cobrado/pendiente)
- [ ] Envío de plan alimentario en texto/PDF al paciente

### Lado paciente
- [ ] Login (Google), asociado a invitación del profesional
- [ ] Ver próximo turno y confirmar
- [ ] Ver plan alimentario vigente
- [ ] Registrar comida/peso (formulario simple)
- [ ] Chat básico con el profesional

### Fuera del MVP (fase 2+)
- [ ] Reglas avanzadas de la bandeja (adherencia, pacientes en riesgo)
- [ ] WhatsApp para recordatorios
- [ ] Cobro online (Mercado Pago / Stripe checkout para pacientes)
- [ ] Base de alimentos con macros y armador de planes por macros
- [ ] Formularios dinámicos (builder)
- [ ] Videollamada integrada
- [ ] App mobile

## 7. Infraestructura recomendada

Para un equipo de 3 devs que necesita velocidad y no quiere operar infraestructura propia:

| Capa | Recomendación | Por qué |
|---|---|---|
| Frontend + backend | **Next.js** (App Router), desplegado en **Vercel** | Un solo framework para UI + API routes, deploy automático por git push, buen soporte de Server Components para dashboards con datos |
| Base de datos + Auth + Storage | **Supabase** (Postgres administrado) | Te da Postgres, Auth con Google OAuth ya integrado, Row Level Security (clave para multi-tenant con datos de salud), Storage para archivos, y Realtime (útil para el chat) — todo en un solo servicio, ideal para no fragmentar la infra con equipo chico |
| Facturación SaaS (NutrIA → profesional) | **Stripe** (o **Mercado Pago Suscripciones** si priorizás medios de pago locales LATAM) | Stripe Billing maneja planes, trials, dunning, facturas. Mercado Pago si necesitás cobrar en pesos/con tarjetas locales sin fricción |
| Cobro paciente → profesional (fase 2) | **Mercado Pago Checkout Pro** | Estándar en LATAM, evita que cada profesional necesite su propia pasarela |
| Email transaccional | **Resend** o **Postmark** | Recordatorios de turno, confirmaciones, invitaciones |
| WhatsApp (fase 2) | **Twilio WhatsApp API** o **360dialog** | Mayor tasa de apertura que email en LATAM |
| Monitoreo de errores | **Sentry** | Gratis hasta cierto volumen, esencial antes de tener soporte formal |
| CI/CD | GitHub + deploy automático de Vercel | Sin configuración adicional |

**Por qué Supabase y no armar todo separado (RDS + Auth0 + S3):** con 3 devs y objetivo de MVP funcional, cada servicio adicional es tiempo de integración y mantenimiento. Supabase reduce esa superficie sin sacrificar Postgres real (podés migrar después si crecés mucho).

## 8. Qué necesitás para ser "SaaS al 100%"

Checklist de lo que falta más allá del producto en sí:

- [ ] **Planes y pricing** definidos (ej: Free/Starter/Pro por cantidad de pacientes)
- [ ] **Onboarding** del profesional (wizard de alta: datos del consultorio, primer paciente, primer turno)
- [ ] **Panel de administración interno** (para ustedes): ver cuentas, uso, dar de baja/soporte
- [ ] **Página pública / landing** con registro
- [ ] **Términos de servicio y política de privacidad** (dato sensible: salud)
- [ ] **Consentimiento informado** del paciente al ser invitado a la plataforma
- [ ] **Sistema de invitación** del profesional al paciente (email con link de alta)
- [ ] **Facturación y cobro automático** del profesional (Stripe/MP Suscripciones)
- [ ] **Soporte** (al menos un canal: email o WhatsApp Business)
- [ ] **Backups automáticos + plan de recuperación ante desastres**
- [ ] **Rate limiting / seguridad de API**
- [ ] **Métricas de producto** (cuántos profesionales activos, churn, uso por feature) — algo simple como PostHog

## 9. Roadmap sugerido

1. **Semana 1-2**: Infra base (auth, DB multi-tenant, deploy) + CRUD pacientes + agenda
2. **Semana 3-4**: Bandeja de hoy (reglas básicas) + lado paciente (login, ver turno, ver plan)
3. **Semana 5-6**: Chat + registro de cobros + envío de planes
4. **Semana 7-8**: Pulido, invitaciones, onboarding, facturación SaaS (Stripe/MP), deploy a producción
