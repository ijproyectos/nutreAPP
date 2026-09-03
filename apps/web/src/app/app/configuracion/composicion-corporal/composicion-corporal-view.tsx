"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { actualizarMetricas, type ActualizarMetricasState } from "./actions";

const initialState: ActualizarMetricasState = { status: "idle" };

export function ComposicionCorporalView({
  metricasIniciales,
}: {
  metricasIniciales: string[];
}) {
  const [state, formAction, pending] = useActionState(actualizarMetricas, initialState);
  const [metricas, setMetricas] = useState<string[]>(metricasIniciales);
  const [nueva, setNueva] = useState("");

  function agregar() {
    const valor = nueva.trim();
    if (!valor || metricas.includes(valor)) {
      setNueva("");
      return;
    }
    setMetricas((prev) => [...prev, valor]);
    setNueva("");
  }

  function quitar(valor: string) {
    setMetricas((prev) => prev.filter((m) => m !== valor));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      agregar();
    }
  }

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Composición corporal</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Métricas propias más allá del peso (ej. % grasa corporal, masa
        muscular). Por ahora es solo tu catálogo de referencia — todavía
        no se cargan valores acá, eso sigue siendo parte de un pase
        aparte sobre Historia Clínica.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nueva_metrica">Métricas</Label>
          <Input
            id="nueva_metrica"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={agregar}
            placeholder="Escribí y presioná Enter para agregar"
          />
          {metricas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {metricas.map((m) => (
                <Badge key={m} variant="secondary" className="gap-1 pr-1">
                  {m}
                  <input type="hidden" name="metricas" value={m} />
                  <button
                    type="button"
                    onClick={() => quitar(m)}
                    className="rounded-full p-0.5 hover:bg-background/50"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.status === "success" && <p className="text-sm text-primary">Guardado.</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
