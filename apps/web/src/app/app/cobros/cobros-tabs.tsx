import Link from "next/link";
import { cn } from "@/lib/utils";

type Pestana = "servicios" | "productos" | "pagos" | "suscripciones";

/** Compartido por las 4 sub-pantallas de Cobros — Server Component
 * simple (rutas reales, no tabs en memoria), mismo criterio ya usado en
 * Configuración (`configuracion-nav.tsx`). "Servicios"/"Productos" son
 * el catálogo de precios nuevo (mockup NutrIA Cobros.dc.html); "Pagos"
 * es el /app/cobros de siempre (registro manual de cobros, RF-070/071);
 * "Suscripciones" ya existía antes de este mockup. */
export function CobrosTabs({ activa }: { activa: Pestana }) {
  const tabs: { href: string; label: string; value: Pestana }[] = [
    { href: "/app/cobros/servicios", label: "Servicios", value: "servicios" },
    { href: "/app/cobros/productos", label: "Productos", value: "productos" },
    { href: "/app/cobros", label: "Pagos", value: "pagos" },
    { href: "/app/cobros/suscripciones", label: "Suscripciones", value: "suscripciones" },
  ];

  return (
    <div className="flex w-fit gap-0.5 rounded-[11px] border border-border bg-[#F1ECF1] p-[3px]">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            activa === tab.value
              ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgba(36,28,44,.1)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
