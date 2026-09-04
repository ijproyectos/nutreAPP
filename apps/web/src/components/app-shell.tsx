"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Rediseño visual definitivo (NutrIA Sistema de Diseño.dc.html): el nav
// principal es solo texto, sin íconos — así está en el mockup y en el
// componente "Ítem de navegación" del sistema de diseño (los 5 estados
// que muestra ahí tampoco tienen ícono). "Cobros" no estaba en el nav
// viejo (gap real, no del rediseño: el módulo existe desde antes y no
// tenía entrada en el sidebar). "Links" queda deshabilitado — el panel
// de links públicos/reservas del mockup es una feature nueva que no
// existe en el sitio, no algo para fabricar en un pase visual.
const NAV_ITEMS = [
  { href: "/app", label: "Inicio" },
  { href: "/app/pacientes", label: "Pacientes" },
  { href: "/app/agenda", label: "Agenda" },
  { href: "/app/chats", label: "Chats" },
  { href: "/app/cobros", label: "Cobros" },
] as const;

const CONTENIDO_ITEMS = [
  { href: "/app/planes", label: "Planes" },
  { href: "/app/alimentos", label: "Alimentos" },
  { href: "/app/recursos", label: "Recursos" },
  { href: "/app/formularios", label: "Formularios" },
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
  agendaConAviso,
  children,
}: {
  profesional: { nombre: string; consultorio: string | null };
  /** "Con aviso" del ítem Agenda — turnos sin confirmar en las próximas
   * 48h, mismo dato que la Bandeja de hoy. */
  agendaConAviso: boolean;
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
      <aside className="sticky top-0 flex h-screen w-[252px] shrink-0 flex-col overflow-y-auto bg-sidebar px-3.5 py-[22px] pb-5 text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-[10px] font-heading text-base font-semibold leading-none text-[#3A2410] shadow-[0_2px_6px_rgba(0,0,0,.18)]"
            style={{ background: "linear-gradient(150deg,#EFBB85,#C4792F)" }}
          >
            N
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-heading text-lg font-medium tracking-[.2px]">NutrIA</div>
            <div className="mt-0.5 truncate text-[11px] text-[#C0AEC0]">
              {profesional.consultorio || profesional.nombre}
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-px">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[9px] py-[9px] text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent pl-3 pr-3 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
                    : "pl-[19px] pr-3 text-[#D3C4D3] hover:bg-white/6 hover:text-white"
                )}
              >
                {active && (
                  <span className="-ml-1 h-[15px] w-[3px] shrink-0 rounded-sm bg-[#EFBB85]" />
                )}
                {item.label}
                {item.href === "/app/agenda" && agendaConAviso && (
                  <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[#E0964A] shadow-[0_0_0_3px_rgba(224,150,74,.16)]" />
                )}
              </Link>
            );
          })}
          <span className="flex cursor-not-allowed items-center gap-2.5 rounded-[9px] py-[9px] pr-3 pl-[19px] text-[13.5px] font-medium text-[#7E6B7E]">
            Links
          </span>

          <p className="px-3 pt-[18px] pb-1.5 text-[10px] font-bold tracking-[.11em] text-[#9C889C] uppercase">
            Contenido
          </p>
          {CONTENIDO_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-[9px] py-2 pr-3 pl-[19px] text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-white"
                    : "text-[#C9B9C9] hover:bg-white/6 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-[18px] flex flex-col gap-px border-t border-sidebar-border pt-2">
            <Link
              href="/app/configuracion"
              className={cn(
                "flex items-center rounded-[9px] py-[9px] pr-3 pl-[19px] text-[13px] font-medium transition-colors",
                isActive("/app/configuracion")
                  ? "bg-sidebar-accent font-semibold text-white"
                  : "text-[#C9B9C9] hover:bg-white/6 hover:text-white"
              )}
            >
              Configuración
            </Link>
          </div>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-auto flex items-center gap-2.5 rounded-[9px] border-t border-sidebar-border px-2 pt-3.5 text-left hover:bg-white/4">
            <div className="flex size-[33px] shrink-0 items-center justify-center rounded-full bg-[#EFBB85] text-[11.5px] font-bold tracking-[.03em] text-[#3A2410]">
              {iniciales(profesional.nombre)}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-semibold">{profesional.nombre}</div>
              <div className="text-[11px] text-[#AE9CAE]">Propietaria</div>
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

      <main className="min-w-0 flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
