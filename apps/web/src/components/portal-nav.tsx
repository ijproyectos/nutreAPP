"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FlaskConical,
  Home,
  LogOut,
  ClipboardList,
  CalendarDays,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/portal", label: "Inicio", icon: Home },
  { href: "/portal/turnos", label: "Mis turnos", icon: CalendarDays },
  { href: "/portal/plan", label: "Mi plan", icon: ClipboardList },
  { href: "/portal/laboratorios", label: "Laboratorios", icon: FlaskConical },
  { href: "/portal/registro", label: "Registrar", icon: NotebookPen },
] as const;

export function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-4" />
        Salir
      </button>
    </header>
  );
}
