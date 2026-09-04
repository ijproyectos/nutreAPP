"use client";

import { useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { formatoFechaSinAnio } from "@/lib/format";
import type { PacienteSinTurno } from "@/lib/queries/pacientes";
import type { TurnoSinConfirmar } from "@/lib/queries/dashboard";
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

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AgendaView({
  turnos,
  pacientes,
  pacienteFijo,
  tipoTurnoDefault,
  pacientesSinTurno,
  turnosSinConfirmar,
}: {
  turnos: Turno[];
  pacientes: PacienteOpcion[];
  /** Viene de /app/agenda?paciente=<id> (link "Agendar" en el listado de
   * Pacientes) — abre directo el diálogo de crear con el paciente puesto. */
  pacienteFijo?: PacienteOpcion;
  /** Configuración → Mi agenda. Solo aplica al crear (no pisa el tipo ya
   * cargado al editar un turno existente). */
  tipoTurnoDefault: "presencial" | "videollamada";
  /** Rediseño: tarjeta de señal "Alta" — misma query que la Bandeja de hoy. */
  pacientesSinTurno: PacienteSinTurno[];
  /** Rediseño: tarjeta de señal "Media" — turnos pendientes en las
   * próximas 48h, misma query que la Bandeja de hoy (el mockup dice
   * "esta semana", acá se mantiene la ventana de 48h ya establecida para
   * que el número coincida en toda la app en vez de definir un segundo
   * criterio de "próximo" solo para esta pantalla). */
  turnosSinConfirmar: TurnoSinConfirmar[];
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

  const sinConfirmarDelDia = turnosDelDia.filter((t) => t.estado === "pendiente").length;

  function abrirCrear(paciente?: PacienteOpcion) {
    setPacienteFijoActivo(paciente);
    setCrearAbierto(true);
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-heading text-[31px] leading-[1.15] tracking-[-.01em]">
            {capitalizar(
              fechaSeleccionada.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            )}
          </h1>
          <p className="mt-[7px] text-sm tabular-nums text-muted-foreground">
            {turnosDelDia.length} {turnosDelDia.length === 1 ? "turno" : "turnos"}
            {turnosDelDia.length > 0 &&
              (sinConfirmarDelDia > 0
                ? ` · ${sinConfirmarDelDia} sin confirmar`
                : " · todos confirmados")}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => abrirCrear(undefined)}>
          <CalendarPlus className="size-4" />
          Nuevo turno
        </Button>
      </div>

      {(pacientesSinTurno.length > 0 || turnosSinConfirmar.length > 0) && (
        <div
          className={`grid gap-3.5 ${
            pacientesSinTurno.length > 0 && turnosSinConfirmar.length > 0
              ? "md:grid-cols-2"
              : "md:grid-cols-1"
          }`}
        >
          {pacientesSinTurno.length > 0 && (
            <div className="min-w-0 rounded-r-2xl border border-[#EFCFC7] border-l-[3px] border-l-[#B4483A] bg-[#FBF1EF] px-[17px] py-[15px]">
              <span className="text-[10px] font-bold tracking-[.11em] text-destructive uppercase">
                Alta
              </span>
              <p className="mt-[5px] truncate text-[15.5px] font-semibold tracking-[-.005em]">
                {pacientesSinTurno.length === 1
                  ? "1 paciente activo sin próximo turno"
                  : `${pacientesSinTurno.length} pacientes activos sin próximo turno`}
              </p>
              <p className="mt-[3px] truncate text-[12.5px] text-muted-foreground">
                {pacientesSinTurno.map((p) => p.nombre).join(" · ")}
              </p>
              <button
                type="button"
                onClick={() => abrirCrear(undefined)}
                className="mt-3 rounded-[9px] border border-[#EFCFC7] bg-card px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-[#F8E8E4]"
              >
                Agendarles turno
              </button>
            </div>
          )}

          {turnosSinConfirmar.length > 0 && (
            <div className="min-w-0 rounded-2xl border border-border bg-card px-[17px] py-[15px] shadow-[0_1px_2px_rgba(36,28,44,.04)]">
              <span className="text-[10px] font-bold tracking-[.11em] text-[#A8631F] uppercase">
                Media
              </span>
              <p className="mt-[5px] truncate text-[15.5px] font-semibold tracking-[-.005em]">
                {turnosSinConfirmar.length === 1
                  ? "1 turno sin confirmar en las próximas 48h"
                  : `${turnosSinConfirmar.length} turnos sin confirmar en las próximas 48h`}
              </p>
              <p className="mt-[3px] truncate text-[12.5px] text-muted-foreground">
                {turnosSinConfirmar
                  .map(
                    (t) =>
                      `${t.pacienteNombre} ${formatoFechaSinAnio(t.fechaHora)}`
                  )
                  .join(" · ")}
              </p>
              <button
                type="button"
                onClick={() => setFechaSeleccionada(new Date(turnosSinConfirmar[0].fechaHora))}
                className="mt-3 text-[12.5px] font-bold text-primary hover:underline"
              >
                {turnosSinConfirmar.length === 1 ? "Ver el turno" : "Ver el primero"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-stretch gap-3">
          <Calendar
            mode="single"
            selected={fechaSeleccionada}
            onSelect={(d) => d && setFechaSeleccionada(d)}
            modifiers={{ conTurno: diasConTurno }}
            modifiersClassNames={{
              conTurno:
                "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-[#9CAF88]",
            }}
            className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04)]"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-24px_rgba(36,28,44,.14)]">
          {turnosDelDia.length === 0 ? (
            <div className="px-6 py-11 text-center">
              <p className="font-heading text-[22px] leading-tight tracking-[-.005em]">
                Sin turnos este día
              </p>
              <p className="mx-auto mt-[7px] max-w-[44ch] text-[13.5px] leading-[1.55] text-muted-foreground">
                No hay nada agendado para esta fecha.
              </p>
              <Button className="mt-[18px] gap-1.5" onClick={() => abrirCrear(undefined)}>
                <CalendarPlus className="size-4" />
                Agendar acá
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
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
