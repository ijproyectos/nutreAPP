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
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { MODALIDAD_LABEL, type Clase, type ItemCatalogo, type Modalidad } from "@/lib/queries/catalogo";
import { archivarServicio, crearOEditarServicio } from "./catalogo-actions";

const MODALIDADES: Modalidad[] = ["presencial_video", "videollamada", "domicilio", "digital"];

const CLASE_LABEL: Record<Clase, string> = {
  consulta: "Consulta",
  paquete: "Paquete",
  producto: "Producto",
};

const ROTULO_DURACION: Record<Clase, string> = {
  consulta: "Duración",
  paquete: "Qué incluye",
  producto: "Entrega",
};

function pill(activo: boolean) {
  return activo
    ? "border-[#D8C4D6] bg-accent text-primary"
    : "border-input bg-background text-[#4C4455] hover:border-[#C8BFC9]";
}

// Handler manual (await directo) en vez de useActionState + <form
// action={fn}>, mismo motivo que el resto de los diálogos de este
// módulo: cerrar y limpiar justo cuando la action resuelve con éxito,
// sin el lint de "setState síncrono en un efecto" que dispara leer el
// resultado desde un useEffect.
export function EditorServicioDialog({
  open,
  onOpenChange,
  clasesDisponibles,
  claseDefault,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qué opciones de "Qué es" mostrar — Servicios ofrece Consulta/
   * Paquete, Productos ya viene fijo a Producto (sin picker, ver
   * catalogo-view.tsx). */
  clasesDisponibles: Clase[];
  claseDefault: Clase;
  /** Si viene, es edición. */
  item?: ItemCatalogo;
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [clase, setClase] = useState<Clase>(item?.clase ?? claseDefault);
  const [precio, setPrecio] = useState(item ? String(item.precio) : "");
  const [duracion, setDuracion] = useState(item?.duracionOEntrega ?? "");
  const [modalidad, setModalidad] = useState<Modalidad>(item?.modalidad ?? "presencial_video");
  const [publico, setPublico] = useState(item?.publico ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precioNum = Number(precio);
  const puedeGuardar = nombre.trim().length > 0 && precioNum > 0;
  const cambioPrecio = item && precioNum > 0 && precioNum !== item.precio;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    if (item) fd.set("id", item.id);
    fd.set("nombre", nombre.trim());
    fd.set("clase", clase);
    fd.set("modalidad", modalidad);
    fd.set("duracion_o_entrega", duracion.trim());
    fd.set("precio", precio);
    fd.set("publico", String(publico));

    const resultado = await crearOEditarServicio({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }
    onOpenChange(false);
  }

  async function handleArchivar() {
    if (!item) return;
    setEnviando(true);
    await archivarServicio(item.id, item.clase);
    setEnviando(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-[22px] font-normal">
            {item ? `Editar ${CLASE_LABEL[clase].toLowerCase()}` : `Nuevo ${CLASE_LABEL[claseDefault].toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Los cambios valen para lo que agendes desde ahora."
              : "Después vas a poder elegirlo al agendar un turno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[17px]">
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold text-muted-foreground">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Consulta de seguimiento"
              className="h-10 rounded-[9px] border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
            />
          </label>

          {clasesDisponibles.length > 1 && (
            <div>
              <p className="pb-1.5 text-[11.5px] font-bold text-muted-foreground">Qué es</p>
              <div className="flex flex-wrap gap-1.5">
                {clasesDisponibles.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setClase(c)}
                    className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${pill(clase === c)}`}
                  >
                    {CLASE_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 basis-36 flex-col gap-1.5 text-[11.5px] font-bold text-muted-foreground">
              Precio
              <span className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-normal text-muted-foreground">
                  $
                </span>
                <input
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="26000"
                  className="h-10 w-full rounded-[9px] border border-input bg-background py-0 pr-3 pl-6 text-sm font-normal tabular-nums text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
                />
              </span>
            </label>
            <label className="flex flex-1 basis-32 flex-col gap-1.5 text-[11.5px] font-bold text-muted-foreground">
              {ROTULO_DURACION[clase]}
              <input
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder={clase === "producto" ? "Entrega inmediata" : "45 min"}
                className="h-10 rounded-[9px] border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
              />
            </label>
          </div>

          {cambioPrecio && (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-[#E8D6BC] bg-[#FBF6EF] px-3.5 py-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#C4792F]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#7A4A16]">
                  De ${item!.precio.toLocaleString("es-AR")} a ${precioNum.toLocaleString("es-AR")}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground text-pretty">
                  Los turnos ya agendados con el precio anterior no cambian. El precio nuevo
                  rige para lo que agendes desde ahora.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="pb-1.5 text-[11.5px] font-bold text-muted-foreground">Modalidad</p>
            <div className="flex flex-wrap gap-1.5">
              {MODALIDADES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidad(m)}
                  className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${pill(modalidad === m)}`}
                >
                  {MODALIDAD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3.5 border-t border-[#F2EBF0] pt-[15px]">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">Mostrar en tu link de reservas</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground text-pretty">
                {publico
                  ? "Los pacientes lo ven y pueden reservarlo solos."
                  : "Solo vos podés agendarlo. No aparece en tu link."}
              </p>
            </div>
            <ToggleSwitch checked={publico} onCheckedChange={setPublico} label="Mostrar en tu link de reservas" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="items-center gap-3 sm:justify-between">
            {item && (
              <button
                type="button"
                onClick={handleArchivar}
                disabled={enviando}
                className="shrink-0 text-[12.5px] font-bold text-destructive disabled:opacity-50"
              >
                Archivar
              </button>
            )}
            <p className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              {puedeGuardar ? "" : "Falta el nombre y el precio."}
            </p>
            <Button type="submit" disabled={!puedeGuardar || enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
