import Link from "next/link";
import { cn } from "@/lib/utils";

/** Compartido entre /app/cobros y /app/cobros/suscripciones — Server
 * Component simple (rutas reales, no tabs en memoria), mismo criterio ya
 * usado en Configuración (`configuracion-nav.tsx`). */
export function CobrosTabs({ activa }: { activa: "cobros" | "suscripciones" }) {
  const tabs = [
    { href: "/app/cobros", label: "Cobros", value: "cobros" as const },
    { href: "/app/cobros/suscripciones", label: "Suscripciones", value: "suscripciones" as const },
  ];

  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            activa === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
