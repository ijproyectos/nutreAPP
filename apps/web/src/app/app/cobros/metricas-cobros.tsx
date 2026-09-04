import { formatoMoneda } from "@/lib/format";
import type { MetricasCobros } from "@/lib/queries/cobros";

/** Las 3 tarjetas de arriba de Cobros — compartidas por las 4 pestañas
 * (mockup NutrIA Cobros.dc.html: se muestran igual sin importar cuál
 * está activa). "Precio más viejo" mira el catálogo completo
 * (servicios + productos), no solo la pestaña actual. */
export function MetricasCobrosCards({ metricas }: { metricas: MetricasCobros }) {
  const mes = new Date().toLocaleDateString("es-AR", { month: "long" });

  return (
    <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card px-[19px] py-[17px] shadow-[0_1px_2px_rgba(36,28,44,.04)]">
        <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Entró en {mes}
        </p>
        <p className="mt-[7px] font-heading text-[27px] leading-[1.1] tracking-[-.015em] tabular-nums">
          {formatoMoneda(metricas.entroEsteMes)}
        </p>
        <p className="mt-1 text-[12.5px] tabular-nums text-muted-foreground">
          {metricas.entroEsteMesCantidad}{" "}
          {metricas.entroEsteMesCantidad === 1 ? "cobro" : "cobros"}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card px-[19px] py-[17px] shadow-[0_1px_2px_rgba(36,28,44,.04)]">
        <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Falta cobrar
        </p>
        <p
          className={`mt-[7px] font-heading text-[27px] leading-[1.1] tracking-[-.015em] tabular-nums ${
            metricas.vencidos > 0 ? "text-destructive" : ""
          }`}
        >
          {formatoMoneda(metricas.faltaCobrar)}
        </p>
        <p className="mt-1 text-[12.5px] tabular-nums text-muted-foreground">
          {metricas.faltaCobrarCantidad}{" "}
          {metricas.faltaCobrarCantidad === 1 ? "cobro" : "cobros"}
          {metricas.vencidos > 0 &&
            ` · ${metricas.vencidos} ${metricas.vencidos === 1 ? "vencido" : "vencidos"}`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card px-[19px] py-[17px] shadow-[0_1px_2px_rgba(36,28,44,.04)]">
        <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Precio más viejo
        </p>
        <p className="mt-[7px] font-heading text-[27px] leading-[1.1] tracking-[-.015em] tabular-nums">
          {metricas.precioMasViejoMeses === null
            ? "—"
            : `${metricas.precioMasViejoMeses} ${metricas.precioMasViejoMeses === 1 ? "mes" : "meses"}`}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {metricas.precioMasViejoMeses === null
            ? "Sin catálogo todavía"
            : metricas.precioMasViejoMeses >= 4
              ? "Conviene revisarlo"
              : "Todo al día"}
        </p>
      </div>
    </div>
  );
}
