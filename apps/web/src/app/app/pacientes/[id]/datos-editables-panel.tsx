"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guardarNotas, type GuardarNotasState } from "./historia-actions";
import { EditarSeccionDialog } from "./editar-seccion-dialog";
import type { SeccionDatos } from "./datos-actions";

const notasInicial: GuardarNotasState = { status: "idle" };

type Campo = { label: string; valor: string | null };
type Seccion = {
  key: SeccionDatos;
  titulo: string;
  origen: string;
  campos: Campo[];
  /** Valores crudos (no formateados) para precargar el diálogo de edición. */
  valoresCrudos: Record<string, string>;
};

/** Tab "Datos" del rediseño — reemplaza la vieja "Completitud del
 * perfil" (solo % + checklist) por lo que muestra el mockup: los datos
 * ya cargados, sección por sección, editables por el profesional
 * directamente acá (antes solo el paciente podía cargarlos, vía el
 * wizard de alta). "Consentimiento" no es una sección editable — no es
 * un dato que el profesional deba poder marcar en nombre del paciente. */
export function DatosEditablesPanel({
  pacienteId,
  porcentaje,
  barra,
  secciones,
  notasGenerales,
  resumenLateral,
}: {
  pacienteId: string;
  porcentaje: number;
  barra: { key: string; completo: boolean }[];
  secciones: Seccion[];
  notasGenerales: string | null;
  resumenLateral: ReactNode;
}) {
  const [editando, setEditando] = useState<Seccion | null>(null);
  const [notasState, notasAction, notasPending] = useActionState(guardarNotas, notasInicial);
  const [notas, setNotas] = useState(notasGenerales ?? "");

  return (
    <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 max-w-[720px]">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-heading text-[27px] leading-none tracking-[-.015em] tabular-nums">
            {porcentaje}%
          </span>
          <span className="text-sm text-muted-foreground">del perfil completo.</span>
        </div>
        <div className="mt-3.5 flex h-1.5 gap-0.5 overflow-hidden rounded-[3px] bg-muted">
          {barra.map((b) => (
            <span
              key={b.key}
              className={`flex-1 ${b.completo ? "bg-[#9CAF88]" : "bg-transparent"}`}
            />
          ))}
        </div>

        {secciones.map((s) => (
          <div key={s.key} className="pt-7">
            <div className="flex items-baseline gap-2.5 border-b border-border pb-2.5">
              <span className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                {s.titulo}
              </span>
              <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                {s.origen}
              </span>
              <button
                type="button"
                onClick={() => setEditando(s)}
                className="ml-auto flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-primary hover:underline"
              >
                <Pencil className="size-3" />
                Editar
              </button>
            </div>
            {s.campos.map((c) => (
              <div key={c.label} className="flex gap-4.5 py-2 text-[13.5px] leading-[1.5]">
                <span className="w-[150px] shrink-0 text-muted-foreground">{c.label}</span>
                <span className="min-w-0 flex-1 text-pretty">{c.valor || "Sin cargar"}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="pt-7">
          <p className="border-b border-border pb-2.5 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Notas privadas
          </p>
          <p className="mt-2.5 text-[12.5px] text-muted-foreground">
            El paciente no ve esto — alergias, preferencias, lo que sea útil tener a mano.
          </p>
          <form action={notasAction} className="mt-2.5 flex flex-col gap-2">
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <textarea
              name="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
            />
            {notasState.status === "error" && (
              <p className="text-xs text-destructive">{notasState.error}</p>
            )}
            <Button type="submit" variant="outline" size="sm" disabled={notasPending} className="self-start">
              {notasPending ? "Guardando…" : "Guardar notas"}
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-[18px]">{resumenLateral}</div>

      {editando && (
        <EditarSeccionDialog
          pacienteId={pacienteId}
          seccion={editando.key}
          valores={editando.valoresCrudos}
          onOpenChange={(open) => !open && setEditando(null)}
        />
      )}
    </div>
  );
}
