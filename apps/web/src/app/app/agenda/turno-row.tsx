"use client";

import Link from "next/link";
import { CalendarCheck2, ExternalLink, NotebookPen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkAgregarAGoogleCalendar } from "@/lib/calendar";
import { EstadoTurnoSelect } from "./estado-turno-select";
import type { Turno } from "./agenda-view";

const RIEL: Record<Turno["estado"], string> = {
  confirmado: "#9CAF88",
  en_curso: "#9CAF88",
  pendiente: "#E0964A",
  cancelado: "#E3DAE2",
};

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
    <div className="flex flex-col gap-3 border-b border-[#F2EBF0] px-[22px] py-[15px] transition-colors last:border-0 hover:bg-[#FCFAFC] sm:flex-row sm:items-center sm:gap-[18px]">
      <div className="flex shrink-0 items-center gap-[18px]">
        <div className="w-14 shrink-0 text-right">
          <p className="text-[15px] font-semibold tabular-nums tracking-[-.01em]">{hora}</p>
        </div>
        <div
          className="h-9 w-[3px] shrink-0 self-stretch rounded-full sm:self-auto"
          style={{ background: RIEL[turno.estado] }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15.5px] font-semibold tracking-[-.005em]">
            {turno.pacienteNombre}
          </span>
          {turno.estado === "pendiente" ? (
            <span className="shrink-0 rounded-full border border-[#EEDCC2] bg-[#FCF3E8] px-[11px] py-1 text-[11.5px] font-bold whitespace-nowrap text-[#A8631F]">
              Sin confirmar
            </span>
          ) : turno.estado === "confirmado" || turno.estado === "en_curso" ? (
            <span className="flex shrink-0 items-center gap-1 text-[11.5px] whitespace-nowrap text-muted-foreground">
              <CalendarCheck2 className="size-3.5 text-[#5A7645]" strokeWidth={1.7} />
              {turno.estado === "en_curso" ? "En curso" : "Confirmado"}
            </span>
          ) : (
            <span className="shrink-0 text-[11.5px] whitespace-nowrap text-muted-foreground">
              Cancelado
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {tipoLabel}
          {turno.notas ? ` · ${turno.notas}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <EstadoTurnoSelect turnoId={turno.id} estadoActual={turno.estado} />
        <Button variant="ghost" size="sm" onClick={onEditar} className="gap-1 text-muted-foreground">
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegistrarBrief}
          className="gap-1 text-muted-foreground"
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
        {turno.pacienteId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/app/pacientes/${turno.pacienteId}`} />}
            className="gap-1 font-bold text-primary"
          >
            Abrir ficha
          </Button>
        )}
      </div>
    </div>
  );
}
