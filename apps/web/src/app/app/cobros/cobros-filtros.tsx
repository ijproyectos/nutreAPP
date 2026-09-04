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
    <div className="flex gap-0.5 rounded-[10px] border border-border bg-secondary p-[3px]">
      {ESTADO_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => router.push(`${pathname}?estado=${tab.value}`)}
          className={cn(
            "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
            estado === tab.value
              ? "bg-accent text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
