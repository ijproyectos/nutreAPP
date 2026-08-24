"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { subirLaboratorio, type SubirLaboratorioState } from "./actions";

const initialState: SubirLaboratorioState = { status: "idle" };

export function SubirLaboratorioDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    subirLaboratorio,
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Upload className="size-4" />
        Subir laboratorio
      </Button>

      <DialogContent className="sm:max-w-md">
        {state.status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Laboratorio subido</DialogTitle>
              <DialogDescription>
                {state.valoresDetectados > 0
                  ? `Se detectaron ${state.valoresDetectados} valor${
                      state.valoresDetectados === 1 ? "" : "es"
                    } automáticamente. Tu nutricionista lo va a revisar antes de usarlo.`
                  : "No pudimos leer valores automáticamente de este archivo — no pasa nada, tu nutricionista los va a cargar al revisarlo."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Subir laboratorio</DialogTitle>
              <DialogDescription>
                PDF, JPG, PNG o HEIC — hasta 15MB. Queda pendiente de
                revisión hasta que tu nutricionista lo valide.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="archivo">Archivo</Label>
                <Input
                  id="archivo"
                  name="archivo"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_estudio">Fecha del estudio</Label>
                <Input
                  id="fecha_estudio"
                  name="fecha_estudio"
                  type="date"
                  required
                />
              </div>
              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Subiendo…" : "Subir"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
