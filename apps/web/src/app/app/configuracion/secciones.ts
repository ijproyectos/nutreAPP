/** Mapa de secciones del mockup de Configuración
 * (`~/Documents/Pantallas/Configuracion/`) — compartido entre el nav
 * (`configuracion-nav.tsx`) y el catch-all de stubs (`[seccion]/page.tsx`).
 * Solo "cuenta" tiene pantalla real; el resto no tenía diseño en el
 * mockup (una sola captura de las 17 secciones del menú) y queda como
 * "Próximamente" — no adivinar contenido para las que no se vieron. */
export type SeccionConfiguracion = {
  slug: string;
  label: string;
  descripcion: string;
};

export const GRUPOS_CONFIGURACION: {
  grupo: string;
  items: SeccionConfiguracion[];
}[] = [
  {
    grupo: "Mi cuenta",
    items: [
      {
        slug: "cuenta",
        label: "Cuenta",
        descripcion: "Identidad, matrícula y firma digital.",
      },
      {
        slug: "mi-agenda",
        label: "Mi agenda",
        descripcion: "Disponibilidad y duración por defecto de los turnos.",
      },
      {
        slug: "mi-google-calendar",
        label: "Mi Google Calendar",
        descripcion:
          "Hoy cada turno tiene un link para agregarlo a Google Calendar manualmente (sin sync de dos vías) — una integración más profunda ya se evaluó y se descartó a propósito por el scope de permisos que pediría. Ver CLAUDE.md, sección Agenda.",
      },
      {
        slug: "notificaciones",
        label: "Notificaciones y app",
        descripcion: "Preferencias de notificaciones por email.",
      },
    ],
  },
  {
    grupo: "Consultorio",
    items: [
      {
        slug: "general",
        label: "General",
        descripcion: "Nombre y datos generales del consultorio.",
      },
      {
        slug: "comunicacion",
        label: "Comunicación",
        descripcion: "Plantillas de mensajes para pacientes.",
      },
      { slug: "sedes", label: "Sedes", descripcion: "Consultorios/direcciones donde atendés." },
      {
        slug: "obras-sociales",
        label: "Obras sociales",
        descripcion: "Catálogo de obras sociales que aceptás.",
      },
      {
        slug: "equipo",
        label: "Equipo",
        descripcion:
          "Cuentas de otros profesionales compartiendo tu consultorio — hoy el modelo es 1 cuenta de Google = 1 profesional sin excepción, esto necesita una decisión de arquitectura antes de construirse, no solo una pantalla nueva.",
      },
      {
        slug: "grupos-de-pacientes",
        label: "Grupos de pacientes",
        descripcion:
          "La gestión de grupos ya existe — se creó como parte del Chat. Ver /app/chats, botón \"Nuevo grupo\".",
      },
      {
        slug: "reservas-online",
        label: "Reservas online",
        descripcion: "Página pública para que un paciente nuevo reserve un turno solo.",
      },
      {
        slug: "cobros",
        label: "Cobros",
        descripcion: "Moneda y métodos de cobro — relacionado con el módulo de Cobros, hoy stub.",
      },
      {
        slug: "plantillas-certificados",
        label: "Plantillas de certificados",
        descripcion: "Generación de certificados en PDF — no existe generación de PDF en el proyecto todavía.",
      },
      {
        slug: "composicion-corporal",
        label: "Composición corporal",
        descripcion: "Métricas antropométricas propias más allá del peso.",
      },
      {
        slug: "planes-alimentarios",
        label: "Planes alimentarios",
        descripcion: "Formato y plantillas por defecto del plan.",
      },
      {
        slug: "chat-portal",
        label: "Chat del portal",
        descripcion: "Configuración del chat que ve el paciente.",
      },
      {
        slug: "suscripcion",
        label: "Suscripción",
        descripcion:
          "Plan y facturación de NutrIA — no hay integración de cobro online en el proyecto (lib/billing.ts sigue siendo un stub) ni planes/precios definidos en ningún doc. Necesita una definición de producto antes de construirse.",
      },
      {
        slug: "exportar-datos",
        label: "Exportar datos",
        descripcion: "Exportar tu cartera de pacientes.",
      },
    ],
  },
];

export const TODAS_LAS_SECCIONES = GRUPOS_CONFIGURACION.flatMap((g) => g.items);
