"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/** Rediseño visual: la ficha pasa de 4 secciones apiladas a un tab bar
 * (subrayado de marca en el activo, mismo patrón visual que el mockup de
 * Ficha de Paciente) — estructural, no solo de color, pero usando los
 * nombres y el contenido reales que ya existen (Historia clínica /
 * Laboratorios / Plan alimentario / Completitud del perfil), no los
 * cuatro tabs del mockup ("Consulta/Historia/Archivos/Datos"), que
 * implican funcionalidad que no está construida (notas con auto-guardado
 * y "enviar devolución", archivo genérico más allá de laboratorios,
 * gráfico de peso). Cada contenido llega ya renderizado desde el Server
 * Component (page.tsx) — es un client wrapper solo para el estado del
 * tab activo. */
export function FichaTabs({
  historia,
  laboratorios,
  plan,
  completitud,
}: {
  historia: ReactNode;
  laboratorios: ReactNode;
  plan: ReactNode;
  /** null cuando el paciente no tiene invitación (no debería pasar en la
   * práctica, todo alta pasa por invitar_paciente, pero se contempla). */
  completitud: ReactNode | null;
}) {
  const [tab, setTab] = useState("historia");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
      <TabsList variant="line" className="mb-0 gap-6 border-b border-border px-0">
        <TabsTrigger
          value="historia"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Historia clínica
        </TabsTrigger>
        <TabsTrigger
          value="laboratorios"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Laboratorios
        </TabsTrigger>
        <TabsTrigger
          value="plan"
          className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
        >
          Plan alimentario
        </TabsTrigger>
        {completitud && (
          <TabsTrigger
            value="completitud"
            className="rounded-none border-none px-0 pb-[11px] text-sm font-semibold text-muted-foreground shadow-none data-active:text-foreground data-active:shadow-[inset_0_-2px_0_var(--primary)]"
          >
            Completitud del perfil
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="historia" className="pt-6">
        {historia}
      </TabsContent>
      <TabsContent value="laboratorios" className="pt-6">
        {laboratorios}
      </TabsContent>
      <TabsContent value="plan" className="pt-6">
        {plan}
      </TabsContent>
      {completitud && (
        <TabsContent value="completitud" className="pt-6">
          {completitud}
        </TabsContent>
      )}
    </Tabs>
  );
}
