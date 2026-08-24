"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {ESTADO_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => pushParams({ estado: tab.value })}
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

      <button
        type="button"
        onClick={() => pushParams({ sin_turno: sinTurno ? null : "1" })}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
          sinTurno
            ? "border-accent-foreground/20 bg-accent text-accent-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="size-1.5 rounded-full bg-current" />
        Sin próximo turno
        <Badge variant="secondary" className="ml-0.5">
          {sinTurnoCount}
        </Badge>
      </button>

      <Button variant="outline" className="gap-1.5" disabled title="Próximamente">
        <SlidersHorizontal className="size-4" />
        Filtros
      </Button>
    </div>
  );
}
