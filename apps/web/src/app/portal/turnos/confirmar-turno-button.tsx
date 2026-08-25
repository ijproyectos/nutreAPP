"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmarTurnoPaciente, type ConfirmarTurnoState } from "./actions";

const initialState: ConfirmarTurnoState = { status: "idle" };

export function ConfirmarTurnoButton({ turnoId }: { turnoId: string }) {
  const [state, formAction, pending] = useActionState(
    confirmarTurnoPaciente,
    initialState
  );

  // No hace falta un branch especial de "éxito" que se quede mostrado: en
  // cuanto el estado cambia a confirmado en la base, page.tsx (server
  // component) deja de renderizar este botón directamente — el
  // revalidatePath ya dispara ese refresh solo.
  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="turno_id" value={turnoId} />
      <Button type="submit" size="sm" disabled={pending} className="gap-1">
        <Check className="size-3.5" />
        {pending ? "Confirmando…" : "Confirmar"}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
