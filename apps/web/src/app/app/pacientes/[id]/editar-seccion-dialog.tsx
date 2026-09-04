"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { actualizarSeccionPerfil, type SeccionDatos } from "./datos-actions";

const TITULO: Record<SeccionDatos, string> = {
  contacto: "Contacto",
  personales: "Datos personales",
  antecedentes: "Antecedentes de salud",
  habitos: "Hábitos y actividad",
};

export type ValoresContacto = { telefono: string; email: string; obra_social: string };
export type ValoresPersonales = {
  fecha_nacimiento: string;
  sexo_biologico: string;
  dni: string;
  sede: string;
  quien_derivo: string;
  motivo_consulta: string;
};
export type ValoresAntecedentes = { condiciones: string; alergias: string; medicacion: string };
export type ValoresHabitos = {
  habitos_comidas: string;
  habitos_quien_cocina: string;
  habitos_movimiento: string;
};

const inputClass =
  "h-10 w-full rounded-[9px] border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]";
const labelClass = "flex flex-col gap-1.5 text-[11.5px] font-bold text-muted-foreground";

// Handler manual, mismo criterio que el resto de los diálogos del
// repo — cerrar y limpiar justo cuando la action resuelve con éxito.
export function EditarSeccionDialog({
  pacienteId,
  seccion,
  valores,
  onOpenChange,
}: {
  pacienteId: string;
  seccion: SeccionDatos;
  valores: Record<string, string>;
  onOpenChange: (open: boolean) => void;
}) {
  const [campos, setCampos] = useState(valores);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(campo: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCampos((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.set("paciente_id", pacienteId);
    fd.set("seccion", seccion);
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);

    const resultado = await actualizarSeccionPerfil({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {TITULO[seccion].toLowerCase()}</DialogTitle>
          <DialogDescription>Lo que cambies queda en la ficha al instante.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {seccion === "contacto" && (
            <>
              <label className={labelClass}>
                Teléfono
                <input className={inputClass} value={campos.telefono ?? ""} onChange={set("telefono")} />
              </label>
              <label className={labelClass}>
                Email
                <input
                  className={inputClass}
                  type="email"
                  value={campos.email ?? ""}
                  onChange={set("email")}
                />
              </label>
              <label className={labelClass}>
                Obra social
                <input
                  className={inputClass}
                  value={campos.obra_social ?? ""}
                  onChange={set("obra_social")}
                />
              </label>
            </>
          )}

          {seccion === "personales" && (
            <>
              <label className={labelClass}>
                Fecha de nacimiento
                <input
                  className={inputClass}
                  type="date"
                  value={campos.fecha_nacimiento ?? ""}
                  onChange={set("fecha_nacimiento")}
                />
              </label>
              <div>
                <p className={labelClass}>Sexo biológico</p>
                <div className="mt-1.5 flex gap-2">
                  {(["femenino", "masculino"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setCampos((prev) => ({ ...prev, sexo_biologico: opcion }))}
                      className={`flex-1 rounded-[9px] border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                        campos.sexo_biologico === opcion
                          ? "border-primary bg-accent text-primary"
                          : "border-input text-foreground hover:border-[#C8BFC9]"
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
              <label className={labelClass}>
                DNI
                <input className={inputClass} value={campos.dni ?? ""} onChange={set("dni")} />
              </label>
              <label className={labelClass}>
                Sede
                <input className={inputClass} value={campos.sede ?? ""} onChange={set("sede")} />
              </label>
              <label className={labelClass}>
                Quién lo derivó
                <input
                  className={inputClass}
                  value={campos.quien_derivo ?? ""}
                  onChange={set("quien_derivo")}
                />
              </label>
              <label className={labelClass}>
                Motivo de consulta
                <input
                  className={inputClass}
                  value={campos.motivo_consulta ?? ""}
                  onChange={set("motivo_consulta")}
                />
              </label>
            </>
          )}

          {seccion === "antecedentes" && (
            <>
              <label className={labelClass}>
                Condiciones
                <textarea
                  className={`${inputClass} h-auto resize-y py-2`}
                  rows={2}
                  value={campos.condiciones ?? ""}
                  onChange={set("condiciones")}
                />
              </label>
              <label className={labelClass}>
                Alergias
                <textarea
                  className={`${inputClass} h-auto resize-y py-2`}
                  rows={2}
                  value={campos.alergias ?? ""}
                  onChange={set("alergias")}
                />
              </label>
              <label className={labelClass}>
                Medicación
                <textarea
                  className={`${inputClass} h-auto resize-y py-2`}
                  rows={2}
                  value={campos.medicacion ?? ""}
                  onChange={set("medicacion")}
                />
              </label>
            </>
          )}

          {seccion === "habitos" && (
            <>
              <label className={labelClass}>
                Comidas por día
                <textarea
                  className={`${inputClass} h-auto resize-y py-2`}
                  rows={2}
                  value={campos.habitos_comidas ?? ""}
                  onChange={set("habitos_comidas")}
                />
              </label>
              <label className={labelClass}>
                Quién cocina
                <input
                  className={inputClass}
                  value={campos.habitos_quien_cocina ?? ""}
                  onChange={set("habitos_quien_cocina")}
                />
              </label>
              <label className={labelClass}>
                Actividad física
                <textarea
                  className={`${inputClass} h-auto resize-y py-2`}
                  rows={2}
                  value={campos.habitos_movimiento ?? ""}
                  onChange={set("habitos_movimiento")}
                />
              </label>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
