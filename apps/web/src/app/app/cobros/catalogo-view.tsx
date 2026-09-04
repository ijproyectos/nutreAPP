"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, TrendingUp } from "lucide-react";
import { formatoMoneda } from "@/lib/format";
import type { MetricasCobros } from "@/lib/queries/cobros";
import { MODALIDAD_LABEL, type Clase, type ItemCatalogo } from "@/lib/queries/catalogo";
import { EditorServicioDialog } from "./editor-servicio-dialog";
import { AumentoPreciosDialog } from "./aumento-precios-dialog";
import { CobrosTabs } from "./cobros-tabs";
import { MetricasCobrosCards } from "./metricas-cobros";

const CLASE_LABEL_SINGULAR: Record<Clase, string> = {
  consulta: "servicio",
  paquete: "servicio",
  producto: "producto",
};

export function CatalogoView({
  vista,
  clasesEditor,
  claseDefault,
  items,
  metricas,
  pacientesActivos,
}: {
  vista: "servicios" | "productos";
  /** Qué opciones de "Qué es" ofrece el editor en esta pestaña. */
  clasesEditor: Clase[];
  claseDefault: Clase;
  items: ItemCatalogo[];
  metricas: MetricasCobros;
  pacientesActivos: { id: string; nombre: string; telefono: string | null }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [itemEditando, setItemEditando] = useState<ItemCatalogo | null>(null);
  const [creando, setCreando] = useState(false);
  const [aumentoAbierto, setAumentoAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [items, busqueda]);

  const publicos = filtrados.filter((i) => i.publico).length;
  const rotuloNuevo = vista === "productos" ? "Nuevo producto" : "Nuevo servicio";
  const titulo = vista === "productos" ? "Productos" : "Servicios";
  const subtitulo =
    vista === "productos"
      ? "Lo que vendés sin que sea una consulta: PDFs, talleres, recetarios."
      : "Lo que cobrás por cada cosa que hacés, y lo que efectivamente entró.";

  return (
    <div className="p-[38px] pb-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-[26px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-[31px] leading-[1.15] tracking-[-.01em]">
              {titulo}
            </h1>
            <p className="mt-[7px] text-sm text-muted-foreground text-pretty">{subtitulo}</p>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setAumentoAbierto(true)}
              className="flex items-center gap-1.5 rounded-[10px] border border-input bg-card px-[15px] py-2.5 text-[13px] font-semibold text-foreground transition-[border-color,box-shadow,transform] hover:border-[#C8BFC9] hover:shadow-[0_1px_3px_rgba(36,28,44,.07)]"
            >
              <TrendingUp className="size-4" strokeWidth={1.6} />
              Actualizar precios
            </button>
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="flex items-center gap-1.5 rounded-[10px] bg-primary px-[15px] py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(60,32,62,.25)] transition-colors hover:bg-[#4A2E4C]"
            >
              <Plus className="size-4" />
              {rotuloNuevo}
            </button>
          </div>
        </div>

        <MetricasCobrosCards metricas={metricas} />

        <div className="mb-[18px] flex flex-wrap items-center gap-3">
          <CobrosTabs activa={vista} />
          <div className="relative min-w-[220px] max-w-[340px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={vista === "productos" ? "Buscar producto…" : "Buscar servicio…"}
              className="h-[38px] w-full rounded-[10px] border border-input bg-background pr-3 pl-9 text-[13.5px] text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-11 text-center shadow-[0_1px_2px_rgba(36,28,44,.04)]">
            <p className="font-heading text-[21px] leading-tight tracking-[-.005em]">
              {vista === "productos" ? "Todavía no vendés productos" : "El catálogo está vacío"}
            </p>
            <p className="mx-auto mt-1.5 max-w-[430px] text-[13.5px] text-muted-foreground text-pretty">
              {vista === "productos"
                ? "Un recetario, un taller, un plan suelto: cualquier cosa que cobres sin que sea una consulta va acá."
                : "Cargá al menos la consulta que más hacés. Sin precio, ningún turno puede cobrarse ni mostrarse en tu link de reservas."}
            </p>
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="mx-auto mt-[18px] flex items-center gap-1.5 rounded-[10px] bg-primary px-[15px] py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(60,32,62,.25)] transition-colors hover:bg-[#4A2E4C]"
            >
              <Plus className="size-4" />
              {rotuloNuevo}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-22px_rgba(36,28,44,.16)]">
            <div className="hidden grid-cols-[minmax(0,2.4fr)_128px_132px_148px_40px] items-center gap-4 border-b border-[#F2EBF0] bg-secondary px-[22px] py-2.5 sm:grid">
              <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                Nombre
              </span>
              <span className="text-right text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                Precio
              </span>
              <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                Actualizado
              </span>
              <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                En {new Date().toLocaleDateString("es-AR", { month: "long" })}
              </span>
              <span />
            </div>

            {filtrados.length === 0 && (
              <p className="px-[22px] py-8 text-center text-sm text-muted-foreground">
                Nada que coincida con &quot;{busqueda}&quot;.
              </p>
            )}

            {filtrados.map((it) => (
              <div
                key={it.id}
                className="grid grid-cols-1 items-center gap-2 border-b border-[#F5EFF4] px-[22px] py-3.5 transition-colors last:border-0 hover:bg-[#FBF9FB] sm:grid-cols-[minmax(0,2.4fr)_128px_132px_148px_40px] sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-accent text-primary">
                    <span className="text-[13px] font-bold">
                      {it.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{it.nombre}</span>
                      {it.publico && (
                        <span className="shrink-0 rounded-full border border-[#C6CEB6] bg-positive px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-positive-foreground">
                          En tu link
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12.5px] text-muted-foreground">
                      {it.duracionOEntrega ? `${it.duracionOEntrega} · ` : ""}
                      {MODALIDAD_LABEL[it.modalidad].toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="text-left text-[15px] font-semibold tabular-nums sm:text-right">
                  {formatoMoneda(it.precio)}
                </div>
                <div
                  className={`flex items-center gap-1.5 text-[12.5px] ${
                    it.mesesDesdeActualizado >= 4
                      ? "font-semibold text-[#8A5417]"
                      : "text-muted-foreground"
                  }`}
                >
                  {it.mesesDesdeActualizado >= 4 && (
                    <span className="size-1.5 shrink-0 rounded-full bg-[#C4792F]" />
                  )}
                  <span className="truncate">
                    {it.mesesDesdeActualizado === 0
                      ? "recién"
                      : `hace ${it.mesesDesdeActualizado} ${it.mesesDesdeActualizado === 1 ? "mes" : "meses"}`}
                  </span>
                </div>
                <div className="truncate text-[12.5px] text-[#4C4455] tabular-nums">
                  {it.usoEsteMes.cantidad === 0
                    ? vista === "productos"
                      ? "sin ventas"
                      : "ninguna"
                    : `${it.usoEsteMes.cantidad} ${vista === "productos" ? "vendidos" : "hechas"} · ${formatoMoneda(it.usoEsteMes.monto)}`}
                </div>
                <button
                  type="button"
                  onClick={() => setItemEditando(it)}
                  className="flex size-8 items-center justify-center justify-self-start rounded-[9px] border border-input bg-background text-muted-foreground transition-colors hover:border-[#C8BFC9] hover:bg-secondary hover:text-primary sm:justify-self-end"
                >
                  <Pencil className="size-[15px]" />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FCFAFC] px-[22px] py-3">
              <p className="text-[12.5px] tabular-nums text-muted-foreground">
                {filtrados.length}{" "}
                {filtrados.length === 1
                  ? CLASE_LABEL_SINGULAR[claseDefault]
                  : `${CLASE_LABEL_SINGULAR[claseDefault]}s`}
                {busqueda ? ` que coinciden con "${busqueda}"` : ` · ${publicos} visibles en tu link`}
              </p>
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="flex items-center gap-1.5 text-[12.5px] font-bold text-primary hover:underline"
              >
                <Plus className="size-4" />
                {rotuloNuevo}
              </button>
            </div>
          </div>
        )}
      </div>

      {creando && (
        <EditorServicioDialog
          open
          onOpenChange={(next) => !next && setCreando(false)}
          clasesDisponibles={clasesEditor}
          claseDefault={claseDefault}
        />
      )}
      {itemEditando && (
        <EditorServicioDialog
          key={itemEditando.id}
          open
          onOpenChange={(next) => !next && setItemEditando(null)}
          clasesDisponibles={clasesEditor}
          claseDefault={claseDefault}
          item={itemEditando}
        />
      )}
      {aumentoAbierto && (
        <AumentoPreciosDialog
          open
          onOpenChange={(next) => !next && setAumentoAbierto(false)}
          pacientesActivos={pacientesActivos}
        />
      )}
    </div>
  );
}
