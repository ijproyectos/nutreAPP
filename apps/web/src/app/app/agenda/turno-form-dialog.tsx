"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { paraInputFecha, paraInputHora } from "@/lib/format";
import { crearTurno, editarTurno, type TurnoFormState } from "./actions";

const initialState: TurnoFormState = { status: "idle" };
const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type PacienteOpcion = { id: string; nombre: string };

export type TurnoParaEditar = {
  id: string;
  fechaHora: string;
  tipo: "presencial" | "videollamada";
  notas: string | null;
};

export function TurnoFormDialog({
  open,
  onOpenChange,
  pacientes,
  fechaInicial,
  turno,
  pacienteFijo,
  tipoDefault,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacientes: PacienteOpcion[];
  /** Solo aplica en modo "crear": fecha default (ej. el día elegido en el calendario). */
  fechaInicial?: Date;
  /** Si viene, es modo "editar" — no se puede reasignar el paciente acá. */
  turno?: TurnoParaEditar;
  /** Crear ya con el paciente fijo (ej. desde el listado de Pacientes). */
  pacienteFijo?: PacienteOpcion;
  /** Configuración → Mi agenda. Solo aplica en modo "crear". */
  tipoDefault: "presencial" | "videollamada";
}) {
  const accion = turno ? editarTurno : crearTurno;
  const [state, formAction, pending] = useActionState(accion, initialState);

  const [fecha, setFecha] = useState(
    turno
      ? paraInputFecha(turno.fechaHora)
      : fechaInicial
        ? paraInputFecha(fechaInicial.toISOString())
        : ""
  );
  const [hora, setHora] = useState(turno ? paraInputHora(turno.fechaHora) : "");
  const [tipo, setTipo] = useState<"presencial" | "videollamada">(
    turno?.tipo ?? tipoDefault
  );
  const [notas, setNotas] = useState(turno?.notas ?? "");

  // Conversión a ISO en el cliente a propósito — ver el comentario en
  // actions.ts (parsearFechaHoraISO). `new Date(\`${fecha}T${hora}\`)`
  // corre en el navegador del profesional, así que queda en SU zona
  // horaria real antes de pasar a UTC.
  const fechaHoraDate = fecha && hora ? new Date(`${fecha}T${hora}`) : null;
  const fechaHoraISO =
    fechaHoraDate && !Number.isNaN(fechaHoraDate.getTime())
      ? fechaHoraDate.toISOString()
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state.status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>{turno ? "Turno actualizado" : "Turno creado"}</DialogTitle>
              <DialogDescription>
                {turno
                  ? "Los cambios ya se guardaron."
                  : "El turno ya está en la agenda."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{turno ? "Editar turno" : "Nuevo turno"}</DialogTitle>
              <DialogDescription>
                {turno
                  ? "Cambiá la fecha, el tipo o las notas del turno."
                  : "Elegí el paciente, la fecha y el tipo de turno."}
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-4">
              {turno && <input type="hidden" name="turno_id" value={turno.id} />}
              <input type="hidden" name="fecha_hora" value={fechaHoraISO} />

              {!turno && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paciente_id">Paciente</Label>
                  {pacienteFijo ? (
                    <>
                      <input type="hidden" name="paciente_id" value={pacienteFijo.id} />
                      <p className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm">
                        {pacienteFijo.nombre}
                      </p>
                    </>
                  ) : (
                    <select
                      id="paciente_id"
                      name="paciente_id"
                      required
                      defaultValue=""
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Elegí un paciente
                      </option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Modalidad</Label>
                <input type="hidden" name="tipo" value={tipo} />
                <div className="flex flex-wrap gap-1.5">
                  {(["presencial", "videollamada"] as const).map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setTipo(valor)}
                      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                        tipo === valor
                          ? "border-[#D8C4D6] bg-accent text-primary"
                          : "border-input bg-background text-muted-foreground hover:border-[#C8BFC9]"
                      }`}
                    >
                      {valor === "presencial" ? "Presencial" : "Videollamada"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notas">
                  Notas <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="notas"
                  name="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                />
              </div>

              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Guardando…" : turno ? "Guardar cambios" : "Crear turno"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
