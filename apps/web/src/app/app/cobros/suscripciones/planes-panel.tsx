"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatoMoneda } from "@/lib/format";
import type { PlanSuscripcion } from "@/lib/queries/suscripciones";
import { crearPlanSuscripcion, eliminarPlanSuscripcion, type CrearPlanSuscripcionState } from "./actions";

const initialState: CrearPlanSuscripcionState = { status: "idle" };

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: "por semana",
  quincenal: "cada 15 días",
  mensual: "por mes",
};

export function PlanesPanel({ planes }: { planes: PlanSuscripcion[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(crearPlanSuscripcion, initialState);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [frecuencia, setFrecuencia] = useState("mensual");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function handleEliminar(id: string) {
    setEliminandoId(id);
    setErrorEliminar(null);
    const resultado = await eliminarPlanSuscripcion(id);
    setEliminandoId(null);
    if (resultado.status === "error") {
      setErrorEliminar(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Planes</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Lo que le cobrás a un paciente suscripto, en cada período.
      </p>

      <form
        action={(fd) => {
          formAction(fd);
          setNombre("");
          setMonto("");
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Seguimiento mensual"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            min="1"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frecuencia">Frecuencia</Label>
          <select
            id="frecuencia"
            name="frecuencia"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Plus className="size-4" />
          {pending ? "Creando…" : "Crear"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="mb-3 text-sm text-destructive">{state.error}</p>
      )}
      {errorEliminar && <p className="mb-3 text-sm text-destructive">{errorEliminar}</p>}

      {planes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no creaste ningún plan.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {planes.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <Repeat className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatoMoneda(p.monto)} {FRECUENCIA_LABEL[p.frecuencia]}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={eliminandoId === p.id}
                onClick={() => handleEliminar(p.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
