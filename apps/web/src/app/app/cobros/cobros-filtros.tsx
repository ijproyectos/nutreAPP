"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const ESTADO_TABS = [
  { value: "pendiente", label: "Pendientes" },
  { value: "cobrado", label: "Cobrados" },
  { value: "todos", label: "Todos" },
] as const;

export function CobrosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const estado = searchParams.get("estado") ?? "pendiente";

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {ESTADO_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => router.push(`${pathname}?estado=${tab.value}`)}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            estado === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
