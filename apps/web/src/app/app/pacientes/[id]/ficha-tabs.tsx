"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TABS = ["consulta", "historia", "archivos", "plan", "datos"] as const;
type Tab = (typeof TABS)[number];

/** Rediseño (NutrIA Ficha de Paciente.dc.html): las 4 pestañas del
 * mockup (Consulta/Historia/Archivos/Datos) más "Plan alimentario",
 * que el mockup no tiene como tab propio — asume que el manejo de
 * planes vive en el módulo "Planes" de la sidebar, que en este proyecto
 * todavía no está construido (sigue "Próximamente"). El generador de
 * planes con IA es funcionalidad real y muy usada; sacarlo de la ficha
 * sin tener dónde ponerlo sería una regresión, no una limpieza — se
 * mantiene como pestaña aparte.
 *
 * Estado activo en la URL (`?tab=`), no en memoria — mismo criterio que
 * el resto del rediseño (Configuración, Cobros): permite linkear
 * directo a una pestaña (ej. "Ver plan" desde el tab Consulta). */
export function FichaTabs({
  consulta,
  historia,
  archivos,
  plan,
  datos,
}: {
  consulta: ReactNode;
  historia: ReactNode;
  archivos: ReactNode;
  plan: ReactNode;
  datos: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "consulta";

  function cambiarTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={(v) => cambiarTab(String(v))}>
      <TabsList variant="line" className="mb-0 gap-6 border-b border-border px-0">
        <TabsTrigger
          value="consulta"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Consulta
        </TabsTrigger>
        <TabsTrigger
          value="historia"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Historia
        </TabsTrigger>
        <TabsTrigger
          value="archivos"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Archivos
        </TabsTrigger>
        <TabsTrigger
          value="plan"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Plan alimentario
        </TabsTrigger>
        <TabsTrigger
          value="datos"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Datos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consulta" className="pt-6">
        {consulta}
      </TabsContent>
      <TabsContent value="historia" className="pt-6">
        {historia}
      </TabsContent>
      <TabsContent value="archivos" className="pt-6">
        {archivos}
      </TabsContent>
      <TabsContent value="plan" className="pt-6">
        {plan}
      </TabsContent>
      <TabsContent value="datos" className="pt-6">
        {datos}
      </TabsContent>
    </Tabs>
  );
}
