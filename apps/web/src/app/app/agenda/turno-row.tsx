"use client";

import { Pencil, NotebookPen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkAgregarAGoogleCalendar } from "@/lib/calendar";
import { EstadoTurnoSelect } from "./estado-turno-select";
import type { Turno } from "./agenda-view";

export function TurnoRow({
  turno,
  onEditar,
  onRegistrarBrief,
}: {
  turno: Turno;
  onEditar: () => void;
  onRegistrarBrief: () => void;
}) {
  const fechaHora = new Date(turno.fechaHora);
  const hora = fechaHora.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const tipoLabel = turno.tipo === "presencial" ? "Presencial" : "Videollamada";

  const linkCalendar = linkAgregarAGoogleCalendar({
    titulo: `Turno con ${turno.pacienteNombre} — NutrIA`,
    descripcion: `${tipoLabel}${turno.notas ? ` — ${turno.notas}` : ""}`,
    inicio: fechaHora,
  });

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {hora} · {turno.pacienteNombre}
        </p>
        <p className="text-xs text-muted-foreground">
          {tipoLabel}
          {turno.notas ? ` · ${turno.notas}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <EstadoTurnoSelect turnoId={turno.id} estadoActual={turno.estado} />
        <Button variant="outline" size="sm" onClick={onEditar} className="gap-1">
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegistrarBrief}
          className="gap-1"
        >
          <NotebookPen className="size-3.5" />
          Brief
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href={linkCalendar} target="_blank" rel="noreferrer" />}
          className="gap-1 text-muted-foreground"
        >
          <ExternalLink className="size-3.5" />
          Calendar
        </Button>
      </div>
    </div>
  );
}
