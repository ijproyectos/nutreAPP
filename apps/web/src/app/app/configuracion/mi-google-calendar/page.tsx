import { CalendarPlus, Info } from "lucide-react";

// Informativa, no una pantalla de settings real: la integración de
// Google Calendar de este proyecto es deliberadamente simple (link
// "Agregar a Google Calendar" por turno, sin OAuth nuevo ni sync de dos
// vías — ver CLAUDE.md, sección Agenda, y la conversación que lo
// definió). Construir acá un panel de "conectar/desconectar" sugeriría
// una integración más profunda que la que existe, y esa expansión ya se
// evaluó y se descartó a propósito — no es solo "falta construirlo".
export default function MiGoogleCalendarPage() {
  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Mi Google Calendar</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Cómo funciona hoy la integración con Google Calendar.
      </p>

      <div className="flex items-start gap-2.5 rounded-lg bg-muted p-3 text-sm">
        <CalendarPlus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p>
          Cada turno de tu Agenda tiene un botón{" "}
          <strong>&quot;Agregar a Google Calendar&quot;</strong> que abre el
          evento precargado para que lo guardes vos, un click por turno.
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-muted p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p>
          No hay sincronización automática de dos vías: editar o cancelar
          un turno después no actualiza el evento ya agregado a tu
          calendario. Una integración más profunda existe como opción
          pero se evaluó y se dejó afuera a propósito — pediría un
          permiso más amplio sobre tu cuenta de Google del que tiene hoy
          NutrIA.
        </p>
      </div>
    </div>
  );
}
