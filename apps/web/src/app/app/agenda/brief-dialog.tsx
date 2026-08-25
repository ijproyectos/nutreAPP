"use client";

import { useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registrarBrief, type BriefState } from "./actions";

const initialState: BriefState = { status: "idle" };

/** RF-032: brief de continuidad — qué se acordó, qué completó el paciente,
 * qué cambió, asociado al turno. */
export function BriefDialog({
  open,
  onOpenChange,
  turnoId,
  pacienteId,
  pacienteNombre,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turnoId: string;
  pacienteId: string;
  pacienteNombre: string;
}) {
  const [state, formAction, pending] = useActionState(registrarBrief, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state.status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Brief guardado</DialogTitle>
              <DialogDescription>
                Queda registrado en el historial de {pacienteNombre}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Brief de continuidad</DialogTitle>
              <DialogDescription>
                Qué se acordó, qué completó {pacienteNombre}, qué cambió.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="turno_id" value={turnoId} />
              <input type="hidden" name="paciente_id" value={pacienteId} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acordado">Acordado</Label>
                <Textarea id="acordado" name="acordado" rows={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="completo">Completó</Label>
                <Textarea id="completo" name="completo" rows={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cambio">Cambió</Label>
                <Textarea id="cambio" name="cambio" rows={2} />
              </div>
              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar brief"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
