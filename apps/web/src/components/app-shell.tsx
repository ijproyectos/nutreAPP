"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  Apple,
  FolderOpen,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/pacientes", label: "Pacientes", icon: Users },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app/chats", label: "Chats", icon: MessageSquare },
] as const;

const CONTENIDO_ITEMS = [
  { href: "/app/planes", label: "Planes", icon: ClipboardList },
  { href: "/app/alimentos", label: "Alimentos", icon: Apple },
  { href: "/app/recursos", label: "Recursos", icon: FolderOpen },
  { href: "/app/formularios", label: "Formularios", icon: FileText },
] as const;

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  profesional,
  children,
}: {
  profesional: { nombre: string; consultorio: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-heading text-lg font-bold text-accent-foreground">
            N
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-semibold">NutrIA</span>
            <span className="text-xs text-sidebar-foreground/60">
              {profesional.consultorio || profesional.nombre}
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}

          <p className="mt-6 px-3 text-xs font-medium tracking-wide text-sidebar-foreground/40">
            CONTENIDO
          </p>
          {CONTENIDO_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-auto flex flex-col gap-0.5 pb-2">
            <Link
              href="/app/configuracion"
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm transition-colors",
                isActive("/app/configuracion")
                  ? "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className="size-4" />
              Configuración
            </Link>
          </div>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 border-t border-sidebar-border px-5 py-4 text-left hover:bg-sidebar-accent/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {iniciales(profesional.nombre)}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">
                {profesional.nombre}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Propietaria/o
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
