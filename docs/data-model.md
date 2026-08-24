# Data model — NutrIA

Modelo multi-tenant: cada **profesional** es un tenant. Todas las tablas de negocio cuelgan de `profesional_id` (denormalizado directo en cada tabla, incluso cuando también hay `paciente_id` — evita policies RLS con joins/subqueries anidadas y mantiene el criterio ya usado en otros proyectos: "toda tabla de negocio lleva el id del tenant directo").

## Entidades

### `profesionales`
Tenant. Se auto-provisiona en el primer login de Google si el usuario elige "Soy profesional" en el onboarding (self-serve, no hay allowlist — a diferencia de un proyecto interno de un solo tenant, acá cualquiera puede darse de alta como profesional).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| user_id | uuid unique, FK auth.users | 1:1 con el usuario de Supabase Auth |
| nombre | text not null | |
| email | text not null | |
| consultorio | text | nombre del consultorio, opcional |
| plan_id | text | default `'free'`, referencia a futuro modelo de pricing (no hay tabla de planes en MVP) |
| created_at | timestamptz | default now() |

### `pacientes`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | tenant |
| user_id | uuid unique, FK auth.users, nullable | se completa recién cuando el paciente acepta la invitación y hace login con Google. Reemplaza a una tabla de mapeo separada — 1 paciente = 1 cuenta en MVP. |
| nombre | text not null | |
| telefono | text | |
| email | text not null | usado para matchear la invitación en el login |
| fecha_nacimiento | date | |
| estado | text not null | `activo` \| `archivado`, default `activo` |
| created_at | timestamptz | default now() |

### `invitaciones`
Invitación de un profesional a un paciente para darlo de alta como usuario. Se crea junto con el `pacientes` (atómico, ver RPC `invitar_paciente`).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| email | text not null | |
| token | uuid | default gen_random_uuid(), unique — va en el link de invitación |
| estado | text not null | `pendiente` \| `aceptada` \| `expirada`, default `pendiente` |
| expires_at | timestamptz not null | default now() + 7 días |
| created_at | timestamptz | default now() |

### `turnos`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| fecha_hora | timestamptz not null | |
| tipo | text not null | `presencial` \| `videollamada` |
| estado | text not null | `pendiente` \| `confirmado` \| `en_curso` \| `cancelado`, default `pendiente` |
| notas | text | |
| created_at | timestamptz | default now() |

### `consultas`
"Brief de continuidad": qué se acordó, qué completó el paciente, qué cambió — vinculado a un turno ya ocurrido.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| turno_id | uuid, FK turnos, nullable | |
| acordado | text | |
| completo | text | |
| cambio | text | |
| fecha | date not null | default current_date |
| created_at | timestamptz | default now() |

### `mediciones`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| fecha | date not null | default current_date |
| peso | numeric(6,2) | kg |
| otras_metricas | jsonb | default `{}`, libre (perímetros, % grasa, etc. a futuro) |
| created_at | timestamptz | default now() |

Insertable tanto por el profesional como por el propio paciente (autorregistro).

### `registros_comida`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| fecha | date not null | default current_date |
| descripcion | text not null | |
| adherencia | boolean | ¿siguió el plan ese día? |
| created_at | timestamptz | default now() |

### `planes`
MVP: contenido en texto plano/markdown. **Sin upload de archivo** (`archivo_url` queda como columna nullable preparada para fase 2, para no requerir bucket de Storage con políticas RLS todavía).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| contenido | text not null | texto/markdown del plan |
| archivo_url | text, nullable | reservado para fase 2 (Storage) |
| enviado_at | timestamptz, nullable | null = borrador, seteado = visible para el paciente |
| created_at | timestamptz | default now() |

### `cobros`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| consulta_id | uuid, FK consultas, nullable | |
| monto | numeric(10,2) not null | |
| estado | text not null | `pendiente` \| `cobrado`, default `pendiente` |
| fecha_vencimiento | date | |
| created_at | timestamptz | default now() |

### `mensajes`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| profesional_id | uuid not null, FK profesionales | |
| paciente_id | uuid not null, FK pacientes | |
| remitente | text not null | `profesional` \| `paciente` |
| contenido | text not null | |
| leido | boolean not null | default false |
| created_at | timestamptz | default now() |

### `laboratorios`
Agregada post-v1 (no estaba en el PRD original) — carga de laboratorios clínicos desde el portal del paciente, con validación humana obligatoria del profesional antes de que puedan usarse como input de un plan generado con IA. Detalle del flujo y del bucket de Storage: `docs/architecture.md` §9.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| paciente_id | uuid not null, FK pacientes | |
| profesional_id | uuid not null, FK profesionales | |
| archivo_url | text not null | path dentro del bucket privado `laboratorios` (`{paciente_id}/{uuid}-{nombre}`), no una URL pública |
| fecha_estudio | date not null | |
| estado | text not null | `pendiente_revision` \| `validado` \| `rechazado`, default `pendiente_revision` |
| valores | jsonb not null | default `{}` — resultados estructurados (ej. `{"glucosa": 95, "hdl": 55}`), llenado por el parseo automático y/o corregido a mano por el profesional |
| notas_profesional | text, nullable | opcional, se completa al validar/rechazar |
| created_at | timestamptz | default now() |

## Reglas de integridad

- Ningún `pacientes.user_id` se setea desde el cliente directamente: solo vía la RPC `aceptar_invitacion(token)` (`SECURITY DEFINER`), que valida token vigente + email del JWT antes de linkear.
- `invitar_paciente(...)` crea `pacientes` + `invitaciones` en una sola transacción (RPC `SECURITY INVOKER`, corre bajo los permisos del profesional autenticado).
- Solo `VENTA`-equivalente en este dominio es `cobros.estado = 'cobrado'`: es lo único que cuenta como ingreso realizado en cualquier métrica financiera futura.
- `mensajes.remitente` debe ser consistente con quién hace el insert (un paciente no puede insertar `remitente = 'profesional'` y viceversa) — se valida en la policy RLS de insert, no solo en el check constraint.

## Fuera del modelo en v1 (decisión deliberada, ver `docs/architecture.md`)

- Tabla de auditoría (quién accedió/modificó qué) — NFR del PRD, se difiere a fase 2.
- Import masivo de pacientes por CSV — solo alta manual en v1.
- `cobros` no tiene integración de pago online — el link de pago es un stub (`lib/billing.ts`).
