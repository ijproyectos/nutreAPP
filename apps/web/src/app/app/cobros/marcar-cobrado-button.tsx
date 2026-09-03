"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarCobrado, type MarcarCobradoState } from "./actions";

const initialState: MarcarCobradoState = { status: "idle" };

export function MarcarCobradoButton({ cobroId }: { cobroId: string }) {
  const [state, formAction, pending] = useActionState(marcarCobrado, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="cobro_id" value={cobroId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending || state.status === "success"}
        className="gap-1"
      >
        <Check className="size-3.5" />
        {state.status === "success"
          ? "Cobrado"
          : pending
            ? "Guardando…"
            : "Marcar como cobrado"}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
