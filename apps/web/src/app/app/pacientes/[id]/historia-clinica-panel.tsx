"use client";

import { useActionState, useState } from "react";
import { Scale, NotebookPen, CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatoFechaCorta } from "@/lib/format";
import {
  registrarMedicion,
  guardarNotas,
  type RegistrarMedicionState,
  type GuardarNotasState,
} from "./historia-actions";

const registrarInicial: RegistrarMedicionState = { status: "idle" };
const notasInicial: GuardarNotasState = { status: "idle" };

type Medicion = { id: string; fecha: string; peso: number | null };
type Turno = {
  id: string;
  fechaHora: string;
  tipo: "presencial" | "videollamada";
  estado: "pendiente" | "confirmado" | "en_curso" | "cancelado";
};

const ESTADO_TURNO_LABEL: Record<Turno["estado"], string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
  cancelado: "Cancelado",
};

/** Sparkline liviano dibujado a mano — no hay librería de gráficos en el
 * stack (ver package.json) y no amerita sumar una para esto. */
function Sparkline({ pesos }: { pesos: number[] }) {
  if (pesos.length < 2) return null;

  const width = 240;
  const height = 48;
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const rango = max - min || 1;
  const paso = width / (pesos.length - 1);
  const puntos = pesos
    .map((p, i) => `${i * paso},${height - ((p - min) / rango) * (height - 8) - 4}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary"
      aria-hidden="true"
    >
      <polyline
        points={puntos}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HistoriaClinicaPanel({
  pacienteId,
  mediciones,
  turnos,
  notasIniciales,
}: {
  pacienteId: string;
  /** Más reciente primero — igual orden que el resto de la ficha. */
  mediciones: Medicion[];
  turnos: Turno[];
  notasIniciales: string | null;
}) {
  const [registrarState, registrarAction, registrarPending] = useActionState(
    registrarMedicion,
    registrarInicial
  );
  const [notasState, notasAction, notasPending] = useActionState(
    guardarNotas,
    notasInicial
  );
  const [notas, setNotas] = useState(notasIniciales ?? "");

  const pesosOrdenados = [...mediciones]
    .filter((m) => m.peso !== null)
    .reverse()
    .map((m) => m.peso as number);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:col-span-2">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
            MEDICIONES
          </h3>
        </div>

        {pesosOrdenados.length >= 2 && (
          <div className="flex items-center gap-3">
            <Sparkline pesos={pesosOrdenados} />
            <span className="text-xs text-muted-foreground">
              {pesosOrdenados[0]}kg → {pesosOrdenados[pesosOrdenados.length - 1]}kg
            </span>
          </div>
        )}

        {mediciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay mediciones registradas.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {mediciones.map((m, i) => {
              const anterior = mediciones[i + 1];
              const delta =
                m.peso != null && anterior?.peso != null
                  ? m.peso - anterior.peso
                  : null;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatoFechaCorta(m.fecha)}
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    {m.peso != null ? `${m.peso}kg` : "—"}
                    {delta !== null && delta !== 0 && (
                      <span
                        className={
                          delta > 0
                            ? "text-xs font-normal text-destructive"
                            : "text-xs font-normal text-positive-foreground"
                        }
                      >
                        {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <form
          key={mediciones.length}
          action={registrarAction}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
        >
          <input type="hidden" name="paciente_id" value={pacienteId} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="fecha-medicion" className="text-xs">
              Fecha
            </Label>
            <Input
              id="fecha-medicion"
              name="fecha"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="h-8 w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="peso-medicion" className="text-xs">
              Peso (kg)
            </Label>
            <Input
              id="peso-medicion"
              name="peso"
              type="number"
              step="0.1"
              min="1"
              placeholder="70.5"
              className="h-8 w-24"
            />
          </div>
          <Button type="submit" size="sm" disabled={registrarPending} className="gap-1">
            <Plus className="size-3.5" />
            {registrarPending ? "Guardando…" : "Agregar"}
          </Button>
          {registrarState.status === "error" && (
            <p className="w-full text-xs text-destructive">
              {registrarState.error}
            </p>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
            HISTORIAL DE TURNOS
          </h3>
        </div>

        {turnos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este paciente todavía no tiene turnos — la Agenda para
            crearlos todavía no está construida.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {turnos.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatoFechaCorta(t.fechaHora)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.tipo === "presencial" ? "Presencial" : "Videollamada"}
                  </p>
                </div>
                <Badge variant="outline">
                  {ESTADO_TURNO_LABEL[t.estado]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
            NOTAS
          </h3>
        </div>
        <form action={notasAction} className="flex flex-col gap-2">
          <input type="hidden" name="paciente_id" value={pacienteId} />
          <Textarea
            name="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={5}
            placeholder="Alergias, preferencias, lo que sea útil tener a mano — el paciente no ve esto."
            className="text-sm"
          />
          {notasState.status === "error" && (
            <p className="text-xs text-destructive">{notasState.error}</p>
          )}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={notasPending}
            className="self-start"
          >
            {notasPending ? "Guardando…" : "Guardar notas"}
          </Button>
        </form>
      </div>
    </div>
  );
}
