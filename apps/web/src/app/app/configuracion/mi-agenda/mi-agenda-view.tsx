"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { actualizarMiAgenda, type ActualizarMiAgendaState } from "./actions";

const initialState: ActualizarMiAgendaState = { status: "idle" };

export function MiAgendaView({
  tipoDefaultInicial,
}: {
  tipoDefaultInicial: "presencial" | "videollamada";
}) {
  const [state, formAction, pending] = useActionState(actualizarMiAgenda, initialState);
  const [tipo, setTipo] = useState(tipoDefaultInicial);

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Mi agenda</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tipo de turno con el que arranca el formulario al crear uno
        nuevo — lo podés cambiar igual turno por turno.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipo_turno_default">Tipo de turno por defecto</Label>
          <div className="flex gap-2">
            {(["presencial", "videollamada"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setTipo(opcion)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  tipo === opcion
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input text-foreground hover:bg-muted"
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
          <input type="hidden" name="tipo_turno_default" value={tipo} />
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
