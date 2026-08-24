"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatoFechaCorta } from "@/lib/format";
import { revisarLaboratorio, type RevisarLaboratorioState } from "./actions";

const initialState: RevisarLaboratorioState = { status: "idle" };

type Props = {
  laboratorio: {
    id: string;
    fecha_estudio: string;
    valores: Record<string, number>;
    notas_profesional: string | null;
  };
  archivoUrl: string | null;
};

export function LaboratorioReviewCard({ laboratorio, archivoUrl }: Props) {
  const [state, formAction, pending] = useActionState(
    revisarLaboratorio,
    initialState
  );
  const [pares, setPares] = useState<{ clave: string; valor: string }[]>(
    Object.entries(laboratorio.valores).map(([clave, valor]) => ({
      clave,
      valor: String(valor),
    }))
  );
  const [notas, setNotas] = useState(laboratorio.notas_profesional ?? "");

  const valoresJson = JSON.stringify(
    Object.fromEntries(
      pares
        .filter(
          (p) =>
            p.clave.trim() && p.valor.trim() && !Number.isNaN(Number(p.valor))
        )
        .map((p) => [p.clave.trim(), Number(p.valor)])
    )
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {formatoFechaCorta(laboratorio.fecha_estudio)}
        </span>
        <div className="flex items-center gap-3">
          <Badge className="border-transparent bg-accent text-accent-foreground">
            Pendiente de revisión
          </Badge>
          {archivoUrl && (
            <a
              href={archivoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver archivo →
            </a>
          )}
        </div>
      </div>

      {pares.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No se detectaron valores automáticamente — cargalos a mano abajo.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="laboratorio_id" value={laboratorio.id} />
        <input type="hidden" name="valores" value={valoresJson} />

        <div className="flex flex-col gap-1.5">
          <Label>Valores</Label>
          {pares.map((par, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="ej. glucosa"
                value={par.clave}
                onChange={(e) => {
                  const next = [...pares];
                  next[i] = { ...next[i], clave: e.target.value };
                  setPares(next);
                }}
                className="flex-1"
              />
              <Input
                placeholder="valor"
                inputMode="decimal"
                value={par.valor}
                onChange={(e) => {
                  const next = [...pares];
                  next[i] = { ...next[i], valor: e.target.value };
                  setPares(next);
                }}
                className="w-28"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPares(pares.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            onClick={() => setPares([...pares, { clave: "", valor: "" }])}
          >
            <Plus className="size-4" />
            Agregar valor
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`notas-${laboratorio.id}`}>Notas (opcional)</Label>
          <Textarea
            id={`notas-${laboratorio.id}`}
            name="notas_profesional"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
          />
        </div>

        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            name="decision"
            value="validado"
            disabled={pending}
          >
            {pending ? "Guardando…" : "Validar"}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="rechazado"
            variant="outline"
            disabled={pending}
          >
            Rechazar
          </Button>
        </div>
      </form>
    </div>
  );
}
