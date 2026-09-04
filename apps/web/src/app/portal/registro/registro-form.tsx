"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { registrarComidaPeso, type RegistroState } from "./actions";

const initialState: RegistroState = { status: "idle" };

// Campos controlados a propósito, no defaultValue/uncontrolled: un <form
// action={...}> resetea sus campos no controlados en cuanto termina la
// transición de la action (React 19), incluso cuando el resultado es un
// error — y registrarComidaPeso nunca lanza (siempre devuelve
// { status }), así que ese reset no se puede evitar con el resultado.
// Sin esto, un error de validación podría vaciar lo que el paciente ya
// había tipeado justo cuando ve el mensaje que le pide corregir y
// reintentar.
export function RegistroForm() {
  const [state, formAction, pending] = useActionState(
    registrarComidaPeso,
    initialState
  );
  const [descripcion, setDescripcion] = useState("");
  const [siguioPlan, setSiguioPlan] = useState(false);
  const [peso, setPeso] = useState("");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descripcion">
          ¿Qué comiste?{" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          placeholder="Ej: ensalada con pollo a la plancha"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="siguio_plan"
          checked={siguioPlan}
          onCheckedChange={(v) => setSiguioPlan(Boolean(v))}
        />
        Seguí el plan
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="peso">
          Peso de hoy (kg){" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="peso"
          name="peso"
          type="number"
          step="0.1"
          min="1"
          placeholder="70.5"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-positive-foreground">
          ¡Guardado! Podés cargar otro.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
