"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { registrarComidaPeso, type RegistroState } from "./actions";

const initialState: RegistroState = { status: "idle" };

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(
    registrarComidaPeso,
    initialState
  );

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
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="siguio_plan" />
        Seguí el plan
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="peso">
          Peso de hoy (kg){" "}
          <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input id="peso" name="peso" type="number" step="0.1" min="1" placeholder="70.5" />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600">
          ¡Guardado! Podés cargar otro.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
