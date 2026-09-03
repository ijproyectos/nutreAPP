"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ObraSocial } from "@/lib/queries/catalogos";
import { agregarObraSocial, eliminarObraSocial, type AgregarObraSocialState } from "./actions";

const initialState: AgregarObraSocialState = { status: "idle" };

export function ObrasSocialesView({
  obrasSocialesIniciales,
}: {
  obrasSocialesIniciales: ObraSocial[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(agregarObraSocial, initialState);
  const [nombre, setNombre] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  async function handleEliminar(id: string) {
    setEliminandoId(id);
    await eliminarObraSocial(id);
    setEliminandoId(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Obras sociales</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Catálogo de obras sociales que aceptás. Todavía no está linkeado a
        la ficha del paciente (ahí &quot;obra social&quot; sigue siendo un campo
        libre).
      </p>

      <form
        action={(fd) => {
          formAction(fd);
          setNombre("");
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. OSDE, Swiss Medical…"
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Plus className="size-4" />
          {pending ? "Agregando…" : "Agregar"}
        </Button>
      </form>

      {state.status === "error" && (
        <p className="mb-3 text-sm text-destructive">{state.error}</p>
      )}

      {obrasSocialesIniciales.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no agregaste ninguna obra social.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {obrasSocialesIniciales.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">{o.nombre}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={eliminandoId === o.id}
                onClick={() => handleEliminar(o.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
