"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Sede } from "@/lib/queries/catalogos";
import { agregarSede, eliminarSede, type AgregarSedeState } from "./actions";

const initialState: AgregarSedeState = { status: "idle" };

export function SedesView({ sedesIniciales }: { sedesIniciales: Sede[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(agregarSede, initialState);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  async function handleEliminar(id: string) {
    setEliminandoId(id);
    await eliminarSede(id);
    setEliminandoId(null);
    // eliminarSede se llama directo (no vía <form action={fn}>), así que
    // no queda envuelta en la transición que hace que Next re-envíe el
    // RSC payload actualizado solo — confirmado por el orquestador sobre
    // el mismo patrón en el módulo Cobros (nuevo-cobro-dialog.tsx).
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Sedes</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Consultorios o direcciones donde atendés. Todavía no está linkeado
        a la ficha del paciente (ahí &quot;sede&quot; sigue siendo un campo libre) —
        es un catálogo propio para organizarte.
      </p>

      <form
        action={(fd) => {
          formAction(fd);
          setNombre("");
          setDireccion("");
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
            placeholder="Ej. Consultorio Palermo"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="direccion">
            Dirección <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="direccion"
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
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

      {sedesIniciales.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no agregaste ninguna sede.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sedesIniciales.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{s.nombre}</p>
                  {s.direccion && (
                    <p className="text-xs text-muted-foreground">{s.direccion}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={eliminandoId === s.id}
                onClick={() => handleEliminar(s.id)}
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
