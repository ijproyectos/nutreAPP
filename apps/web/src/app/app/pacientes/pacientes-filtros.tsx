"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ESTADO_TABS = [
  { value: "activos", label: "Activos" },
  { value: "archivados", label: "Archivados" },
  { value: "todos", label: "Todos" },
] as const;

export function PacientesFiltros({ sinTurnoCount }: { sinTurnoCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const estado = searchParams.get("estado") ?? "activos";
  const sinTurno = searchParams.get("sin_turno") === "1";
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: q || null });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex h-[38px] w-[300px] min-w-[200px] shrink items-center gap-2 rounded-[10px] border border-input bg-card px-3.5">
        <Search className="size-4 shrink-0 text-[#BAB2BE]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#A69EAA]"
        />
      </div>

      <div className="flex gap-0.5 rounded-[10px] border border-border bg-[#F1EAEF] p-[3px]">
        {ESTADO_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => pushParams({ estado: tab.value })}
            className={cn(
              "rounded-lg px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors",
              estado === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => pushParams({ sin_turno: sinTurno ? null : "1" })}
        className={cn(
          "flex h-[38px] items-center gap-2 rounded-[10px] border pl-3.5 pr-3 text-[12.5px] font-semibold transition-colors",
          sinTurno
            ? "border-[#EED3CB] bg-[#FBEFEB] text-destructive hover:border-[#E1BBB1] hover:bg-[#F8E4DD]"
            : "border-border bg-card text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="size-1.5 rounded-full bg-[#B4483A]" />
        Sin próximo turno
        <span className="rounded-full bg-[#F1D3CB] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#8E3C2F]">
          {sinTurnoCount}
        </span>
      </button>

      <Button variant="outline" size="lg" className="h-[38px] gap-1.5" disabled title="Próximamente">
        <SlidersHorizontal className="size-4" />
        Filtros
      </Button>
    </div>
  );
}
