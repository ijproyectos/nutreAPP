/**
 * Link "Agregar a Google Calendar" — la integración con Calendar que se
 * decidió para v1 (ver CLAUDE.md, sección Agenda, para el porqué): sin
 * OAuth nuevo, sin guardar tokens de Google, sin proceso de verificación
 * extra. Abre calendar.google.com con el evento precargado para un click.
 *
 * Trade-off deliberado: no sincroniza cambios después. Si el turno se
 * edita o cancela en NutrIA, el evento que ya se agregó al Calendar del
 * profesional (o del paciente) queda como estaba — no hay un webhook ni un
 * job que lo actualice. Un sync de dos vías real requeriría pedir el scope
 * `calendar.events` en el login de Google (re-consentimiento de todos los
 * profesionales ya logueados), guardar su refresh token, y muy
 * probablemente una verificación de Google más estricta que la actual —
 * evaluado y descartado para este alcance, no un olvido.
 */
export function linkAgregarAGoogleCalendar(params: {
  titulo: string;
  descripcion?: string;
  inicio: Date;
  /** NutrIA no guarda una duración por turno — 45min es una duración
   * típica de consulta nutricional, ver docs/data-model.md `turnos` si en
   * algún momento se agrega el campo real. */
  duracionMinutos?: number;
}): string {
  const duracion = params.duracionMinutos ?? 45;
  const fin = new Date(params.inicio.getTime() + duracion * 60 * 1000);

  const formato = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: params.titulo,
    dates: `${formato(params.inicio)}/${formato(fin)}`,
  });
  if (params.descripcion) query.set("details", params.descripcion);

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}
