"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GRUPOS_CONFIGURACION } from "./secciones";

export function ConfiguracionNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-5 border-r border-border p-4">
      {GRUPOS_CONFIGURACION.map((g) => (
        <div key={g.grupo} className="flex flex-col gap-0.5">
          <p className="mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground">
            {g.grupo.toUpperCase()}
          </p>
          {g.items.map((item) => {
            const href = `/app/configuracion/${item.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={item.slug}
                href={href}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
