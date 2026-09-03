"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actualizarPlanes, type ActualizarPlanesState } from "./actions";

const initialState: ActualizarPlanesState = { status: "idle" };

export function PlanesAlimentariosView({
  plantillaInicial,
}: {
  plantillaInicial: string;
}) {
  const [state, formAction, pending] = useActionState(actualizarPlanes, initialState);
  const [plantilla, setPlantilla] = useState(plantillaInicial);

  return (
    <div className="max-w-xl rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Planes alimentarios</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Texto con el que arranca &quot;Escribir manualmente&quot; en la
        ficha de cada paciente — seguís pudiendo editarlo libremente antes
        de guardar o enviar.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plantilla_plan_alimentario">Plantilla por defecto</Label>
          <Textarea
            id="plantilla_plan_alimentario"
            name="plantilla_plan_alimentario"
            rows={8}
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value)}
            placeholder={"Desayuno:\nAlmuerzo:\nMerienda:\nCena:\nColaciones:"}
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
