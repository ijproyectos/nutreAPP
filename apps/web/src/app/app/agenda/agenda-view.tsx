"use client";

import { useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { TurnoFormDialog, type PacienteOpcion } from "./turno-form-dialog";
import { TurnoRow } from "./turno-row";
import { BriefDialog } from "./brief-dialog";

export type Turno = {
  id: string;
  fechaHora: string;
  tipo: "presencial" | "videollamada";
  estado: "pendiente" | "confirmado" | "en_curso" | "cancelado";
  notas: string | null;
  pacienteId: string;
  pacienteNombre: string;
};

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function AgendaView({
  turnos,
  pacientes,
  pacienteFijo,
  tipoTurnoDefault,
}: {
  turnos: Turno[];
  pacientes: PacienteOpcion[];
  /** Viene de /app/agenda?paciente=<id> (link "Agendar" en el listado de
   * Pacientes) — abre directo el diálogo de crear con el paciente puesto. */
  pacienteFijo?: PacienteOpcion;
  /** Configuración → Mi agenda. Solo aplica al crear (no pisa el tipo ya
   * cargado al editar un turno existente). */
  tipoTurnoDefault: "presencial" | "videollamada";
}) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date());
  // Lazy init (función, no valor) para que abrir con ?paciente= no dependa
  // de un efecto — se decide una sola vez, en el primer render.
  const [crearAbierto, setCrearAbierto] = useState(() => Boolean(pacienteFijo));
  // Estado propio (no la prop directo): así el botón genérico "Nuevo
  // turno" puede limpiarlo para agendar a otro paciente sin que quede
  // pegado al que vino por ?paciente= la primera vez.
  const [pacienteFijoActivo, setPacienteFijoActivo] = useState(pacienteFijo);
  const [turnoEditando, setTurnoEditando] = useState<Turno | null>(null);
  const [turnoParaBrief, setTurnoParaBrief] = useState<Turno | null>(null);

  const diasConTurno = useMemo(
    () =>
      turnos.filter((t) => t.estado !== "cancelado").map((t) => new Date(t.fechaHora)),
    [turnos]
  );

  const turnosDelDia = useMemo(
    () =>
      turnos
        .filter((t) => mismoDia(new Date(t.fechaHora), fechaSeleccionada))
        .sort((a, b) => +new Date(a.fechaHora) - +new Date(b.fechaHora)),
    [turnos, fechaSeleccionada]
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-stretch gap-3">
        <Calendar
          mode="single"
          selected={fechaSeleccionada}
          onSelect={(d) => d && setFechaSeleccionada(d)}
          modifiers={{ conTurno: diasConTurno }}
          modifiersClassNames={{
            conTurno:
              "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-accent-foreground",
          }}
          className="rounded-xl border border-border bg-card"
        />
        <Button
          className="gap-1.5"
          onClick={() => {
            setPacienteFijoActivo(undefined);
            setCrearAbierto(true);
          }}
        >
          <CalendarPlus className="size-4" />
          Nuevo turno
        </Button>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground">
          {fechaSeleccionada
            .toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
            .toUpperCase()}
        </h2>
        {turnosDelDia.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay turnos para este día.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {turnosDelDia.map((t) => (
              <TurnoRow
                key={t.id}
                turno={t}
                onEditar={() => setTurnoEditando(t)}
                onRegistrarBrief={() => setTurnoParaBrief(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Montado condicionalmente (no solo `open` alternando) — el QA
          encontró que dejarlo siempre montado hacía que useActionState
          sobreviviera al cierre: al reabrir sin cambiar de turno (crear
          dos turnos seguidos, o editar el mismo turno dos veces) quedaba
          pegado en la pantalla de "Turno creado/actualizado" de la vez
          anterior. El `key` sigue haciendo falta para cuando SÍ cambia
          qué turno se edita, mismo motivo que HistoriaClinicaPanel/
          PlanIAPanel: el useState local de fecha/hora/tipo/notas solo se
          inicializa en el mount. */}
      {(crearAbierto || turnoEditando !== null) && (
        <TurnoFormDialog
          key={turnoEditando?.id ?? "crear"}
          open
          onOpenChange={(next) => {
            if (!next) {
              setCrearAbierto(false);
              setTurnoEditando(null);
            }
          }}
          pacientes={pacientes}
          fechaInicial={fechaSeleccionada}
          turno={turnoEditando ?? undefined}
          pacienteFijo={turnoEditando ? undefined : pacienteFijoActivo}
          tipoDefault={tipoTurnoDefault}
        />
      )}

      {turnoParaBrief && (
        <BriefDialog
          key={turnoParaBrief.id}
          open
          onOpenChange={(next) => !next && setTurnoParaBrief(null)}
          turnoId={turnoParaBrief.id}
          pacienteId={turnoParaBrief.pacienteId}
          pacienteNombre={turnoParaBrief.pacienteNombre}
        />
      )}
    </div>
  );
}
