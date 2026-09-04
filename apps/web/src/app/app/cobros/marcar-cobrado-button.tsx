"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarCobrado, type MarcarCobradoState } from "./actions";

const initialState: MarcarCobradoState = { status: "idle" };

export function MarcarCobradoButton({ cobroId }: { cobroId: string }) {
  const [state, formAction, pending] = useActionState(marcarCobrado, initialState);

  return (
    <form
      action={formAction}
      className="flex items-center justify-start gap-1.5 sm:justify-end"
    >
      <input type="hidden" name="cobro_id" value={cobroId} />
      <Button
        type="submit"
        variant="outline"
        size="icon"
        title="Marcar como cobrado"
        disabled={pending || state.status === "success"}
        className="size-8 rounded-[9px] border-[#C6CEB6] text-[#5A7645] hover:bg-positive"
      >
        <Check className="size-4" strokeWidth={1.8} />
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
