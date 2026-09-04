"use client";

import { useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { subirDocumento } from "./documentos-actions";

// Handler manual, mismo criterio que el resto de los diálogos de
// adjuntos del repo (NuevoGrupoDialog, etc.): cerrar y limpiar justo
// cuando la action resuelve con éxito.
export function SubirDocumentoDialog({ pacienteId }: { pacienteId: string }) {
  const [open, setOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setArchivo(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.set("paciente_id", pacienteId);
    fd.set("archivo", archivo);

    const resultado = await subirDocumento({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Upload className="size-3.5" />
        Subir archivo
      </Button>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Subir archivo</DialogTitle>
          <DialogDescription>
            Un PDF, una foto de un laboratorio o un informe. Queda fechado en la historia del
            paciente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={!archivo || enviando}>
              {enviando ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
