# Prompt para Claude Code — NutrIA MVP

Copiá y pegá esto tal cual en Claude Code (ajustá lo que esté entre `[ ]`).

---

Quiero que construyas la primera versión (MVP) de **NutrIA**, un SaaS multi-tenant para nutricionistas en LATAM, con dos frontales: **panel del profesional** y **portal del paciente**.

## Stack

- Next.js 14+ (App Router), TypeScript
- Tailwind CSS + shadcn/ui
- Supabase como backend: Postgres, Auth (Google OAuth), Storage, Row Level Security
- Deploy target: Vercel

## Modelo de datos (multi-tenant)

Cada profesional es un tenant. Todo el resto de las tablas cuelga de `profesional_id` y usa Row Level Security para que un profesional NUNCA pueda ver datos de otro.

Tablas principales a crear (con migraciones SQL de Supabase):

- `profesionales` (id, user_id [FK a auth.users], nombre, email, consultorio, plan_id, created_at)
- `pacientes` (id, profesional_id, nombre, telefono, email, fecha_nacimiento, estado [activo/archivado], created_at)
- `turnos` (id, profesional_id, paciente_id, fecha_hora, tipo [presencial/videollamada], estado [pendiente/confirmado/en_curso/cancelado], notas)
- `consultas` (id, paciente_id, turno_id, acordado, completo, cambio, fecha) -- el "brief de continuidad"
- `mediciones` (id, paciente_id, fecha, peso, otras_metricas jsonb)
- `registros_comida` (id, paciente_id, fecha, descripcion, adherencia boolean)
- `planes` (id, profesional_id, paciente_id, contenido, archivo_url, enviado_at)
- `cobros` (id, profesional_id, paciente_id, consulta_id, monto, estado [pendiente/cobrado], fecha_vencimiento)
- `mensajes` (id, profesional_id, paciente_id, remitente [profesional/paciente], contenido, created_at)
- `invitaciones` (id, profesional_id, paciente_id, email, token, estado, expires_at)

Todas las tablas (excepto `profesionales`) deben tener políticas RLS que solo permitan acceso si `auth.uid()` corresponde al `profesional_id` del registro (para el rol profesional) o al paciente vinculado (para el rol paciente, vía una tabla de mapeo `user_id -> paciente_id`).

## Autenticación

- Login con **Google OAuth** vía Supabase Auth, para ambos roles.
- Al loguearse, si el email no está asociado a ningún `profesional` ni `paciente`, mostrar un flujo de onboarding: "¿Sos profesional o fuiste invitado como paciente?"
- El paciente solo puede loguearse si fue invitado previamente por un profesional (existe una fila en `invitaciones` o `pacientes` con ese email).
- Separar rutas: `/app/*` para profesional, `/portal/*` para paciente, con middleware que valide el rol.

## Panel del profesional — pantallas a construir

1. **Dashboard "Bandeja de hoy"**: réplica funcional de las capturas que te adjunto (ver imágenes). Debe mostrar:
   - Feed de alertas priorizadas (Alta/Media/Baja): pacientes sin próximo turno, turnos sin confirmar. Calculalas con queries reales, no hardcodeadas.
   - Panel lateral de métricas: % continuidad (pacientes con turno agendado / total activos), $ por cobrar (suma de cobros pendientes).
   - Widget de agenda del día con el detalle de la consulta en curso (acordado/completó/cambió).
2. **Pacientes**: listado con búsqueda y filtro por "sin próximo turno", alta de paciente, ficha de detalle con historial de turnos y mediciones.
3. **Agenda**: vista de calendario/lista de turnos, crear/editar/cancelar, cambiar estado.
4. **Chats**: lista de conversaciones por paciente + vista de mensajería simple (polling o Supabase Realtime).
5. **Cobros**: listado de cobros con estado, marcar como cobrado, ver total pendiente.
6. **Planes**: subir/escribir un plan alimentario y asociarlo a un paciente (envío simple, sin builder complejo en esta v1).

## Portal del paciente — pantallas a construir

1. Login con Google (solo si fue invitado).
2. Dashboard: próximo turno + botón de confirmar, plan vigente, acceso a registrar comida/peso.
3. Ver turnos y confirmarlos.
4. Ver plan alimentario asignado.
5. Formulario simple para registrar comida del día y peso.
6. Chat con su profesional.

## Facturación

Este MVP no necesita cobro online funcionando en producción todavía, pero dejá preparada la estructura:
- Tabla `cobros` ya definida arriba, con estado manual (el profesional marca "cobrado").
- Un stub de servicio `lib/billing.ts` con una función `crearLinkDePago(cobroId)` que por ahora solo loguea, pensado para integrar Mercado Pago Checkout Pro después.
- No implementes todavía la suscripción SaaS (NutrIA cobrándole al profesional); eso es fase 2.

## Reglas generales

- Usa Server Components donde tenga sentido, Server Actions para mutaciones.
- Toda query a Supabase debe pasar por RLS, nunca uses la service role key desde el cliente.
- Seed script con datos de ejemplo (3-4 pacientes, algunos turnos, algún cobro pendiente) para poder probar el dashboard con datos reales.
- Diseño: paleta oscura/violeta para el sidebar del profesional (como en las capturas), fondo claro (beige/blanco) para el contenido — mantené consistencia con el diseño ya definido.
- Priorizá que el flujo end-to-end funcione (login → ver dashboard → crear paciente → agendar turno → paciente confirma) por sobre pulir detalles visuales en esta primera pasada.

Empezá por: setup del proyecto + Supabase + esquema de base de datos + auth con Google, y after that avisame antes de seguir con las pantallas.
