import { getAuthorizedPaciente } from "@/lib/dal";
import { formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ConfirmarTurnoButton } from "./confirmar-turno-button";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
  cancelado: "Cancelado",
};

// RF-082: listado de turnos propios + confirmar los pendientes. RLS
// (turnos_select_paciente) ya filtra a solo los turnos de este paciente —
// no hace falta un .eq(paciente_id) acá.
export default async function MisTurnosPage() {
  const { supabase } = await getAuthorizedPaciente();

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha_hora, tipo, estado")
    .order("fecha_hora", { ascending: false });

  const ahora = new Date().getTime();
  const proximos = (turnos ?? [])
    .filter(
      (t) => new Date(t.fecha_hora).getTime() >= ahora && t.estado !== "cancelado"
    )
    .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora));
  const historial = (turnos ?? []).filter(
    (t) => new Date(t.fecha_hora).getTime() < ahora || t.estado === "cancelado"
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl">Mis turnos</h1>
        <p className="text-sm text-muted-foreground">
          Confirmá tus turnos pendientes.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
          PRÓXIMOS
        </h2>
        {proximos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No tenés turnos agendados.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card px-4">
            {proximos.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">
                    {formatoFechaCorta(t.fecha_hora)} ·{" "}
                    {new Date(t.fecha_hora).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.tipo === "presencial" ? "Presencial" : "Videollamada"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ESTADO_LABEL[t.estado] ?? t.estado}
                  </Badge>
                  {t.estado === "pendiente" && (
                    <ConfirmarTurnoButton turnoId={t.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground">
            HISTORIAL
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card px-4">
            {historial.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 py-3 text-muted-foreground"
              >
                <p className="text-sm">
                  {formatoFechaCorta(t.fecha_hora)} ·{" "}
                  {t.tipo === "presencial" ? "Presencial" : "Videollamada"}
                </p>
                <Badge variant="outline">{ESTADO_LABEL[t.estado] ?? t.estado}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
