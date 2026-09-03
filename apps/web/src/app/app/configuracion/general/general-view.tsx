"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarGeneral, type ActualizarGeneralState } from "./actions";

const initialState: ActualizarGeneralState = { status: "idle" };

export function GeneralView({ consultorioInicial }: { consultorioInicial: string }) {
  const [state, formAction, pending] = useActionState(actualizarGeneral, initialState);
  const [consultorio, setConsultorio] = useState(consultorioInicial);

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">General</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Nombre del consultorio — se muestra en la barra lateral en vez de
        tu nombre personal cuando está cargado.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="consultorio">Nombre del consultorio</Label>
          <Input
            id="consultorio"
            name="consultorio"
            value={consultorio}
            onChange={(e) => setConsultorio(e.target.value)}
            placeholder="Ej. Consultorio Nutricional Medina"
          />
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
