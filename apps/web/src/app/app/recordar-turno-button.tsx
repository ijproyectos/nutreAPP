"use client";

import { useActionState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordarTurno, type RecordarTurnoState } from "./recordatorio-actions";

const initialState: RecordarTurnoState = { status: "idle" };

export function RecordarTurnoButton({
  turnoId,
  pacienteNombre,
}: {
  turnoId: string;
  pacienteNombre: string;
}) {
  const [state, formAction, pending] = useActionState(
    recordarTurno,
    initialState
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="turno_id" value={turnoId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending || state.status === "success"}
        className="gap-1"
      >
        {state.status === "success" ? (
          <Check className="size-3.5" />
        ) : (
          <Bell className="size-3.5" />
        )}
        {state.status === "success"
          ? "Enviado"
          : pending
            ? "Enviando…"
            : `Recordar a ${pacienteNombre}`}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
