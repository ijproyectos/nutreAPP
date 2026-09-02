"use client";

import { useState, type FormEvent } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { crearGrupo } from "./actions";

export function NuevoGrupoDialog({
  pacientesDisponibles,
  onCreado,
}: {
  pacientesDisponibles: { id: string; nombre: string }[];
  onCreado: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setNombre("");
    setSeleccionados(new Set());
    setError(null);
  }

  // Handler manual en vez de useActionState + <form action={fn}> + un
  // useEffect leyendo el resultado: acá necesitamos cerrar el diálogo y
  // avisar al padre justo cuando la Server Action resuelve con éxito, y
  // hacerlo desde un useEffect dispara el lint de React ("Calling
  // setState synchronously within an effect can trigger cascading
  // renders") porque re-abrir el diálogo más adelante reusaría el mismo
  // estado "success" ya resuelto. Con await directo acá, el cierre pasa
  // en el mismo evento que originó el submit, no en una reacción a un
  // cambio de estado — más simple y sin el gotcha.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Ponele un nombre al grupo.");
      return;
    }
    if (seleccionados.size < 2) {
      setError("Elegí al menos 2 pacientes.");
      return;
    }

    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.set("nombre", nombre.trim());
    for (const id of seleccionados) fd.append("miembros", id);

    const resultado = await crearGrupo({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }
    if (resultado.status !== "success") return; // no debería pasar, conforma a TS

    reset();
    setOpen(false);
    onCreado(resultado.grupoId);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Nuevo grupo
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Users className="size-4" />
            Nuevo grupo
          </DialogTitle>
          <DialogDescription>
            Creá un grupo para chatear con varios pacientes a la vez — todos
            los miembros ven los mensajes de los demás.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre-grupo">Nombre del grupo</Label>
            <Input
              id="nombre-grupo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Plan detox — enero"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Miembros ({seleccionados.size})</Label>
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-2">
              {pacientesDisponibles.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">
                  No hay pacientes activos todavía.
                </p>
              )}
              {pacientesDisponibles.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={seleccionados.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Creando…" : "Crear grupo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
