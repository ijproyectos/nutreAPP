"use client";

import { useMemo, useState } from "react";
import { formatoFechaSinAnio } from "@/lib/format";

export type EventoHistoria = {
  fecha: string; // ISO
  tipo: "Consulta" | "Medición" | "Plan" | "Formulario" | "Alta";
  texto: string;
};

const FILTROS = ["Todo", "Consultas", "Mediciones", "Planes", "Formularios"] as const;

const TIPO_POR_FILTRO: Record<(typeof FILTROS)[number], EventoHistoria["tipo"] | null> = {
  Todo: null,
  Consultas: "Consulta",
  Mediciones: "Medición",
  Planes: "Plan",
  Formularios: "Formulario",
};

/** Rediseño (tab "Historia" del mockup) — reemplaza los 3 bloques
 * apilados que tenía este tab (Mediciones/Turnos/Notas, ahora movidos:
 * mediciones al tab Consulta, notas privadas al tab Datos) por una
 * línea de tiempo única y filtrable. `eventos` ya viene mezclado y
 * ordenado desde el Server Component (page.tsx) — acá solo se filtra
 * client-side, sin otra ida y vuelta al server.
 *
 * Sin "Devoluciones" como filtro (a diferencia del mockup): no existe
 * esa feature en el proyecto — "enviar devolución" (tab Consulta) manda
 * un mensaje de Chat común, no genera un registro propio distinguible
 * de cualquier otro mensaje. */
export function HistoriaTimelinePanel({ eventos }: { eventos: EventoHistoria[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todo");

  const filtrados = useMemo(() => {
    const tipo = TIPO_POR_FILTRO[filtro];
    return tipo ? eventos.filter((e) => e.tipo === tipo) : eventos;
  }, [eventos, filtro]);

  return (
    <div className="max-w-[820px]">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              filtro === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-[#4C4455] hover:border-[#C8BFC9]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="pt-2">
          <p className="font-heading text-[21px] leading-tight">
            {eventos.length === 0 ? "La historia arranca acá" : "Nada de este tipo todavía"}
          </p>
          <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.55] text-muted-foreground text-pretty">
            {eventos.length === 0
              ? "A medida que registres consultas, mediciones y planes, van a ir apareciendo acá en orden."
              : "Probá con otro filtro o mirá todo junto."}
          </p>
        </div>
      ) : (
        <div>
          {filtrados.map((e, i) => (
            <div
              key={i}
              className="flex items-baseline gap-5 border-b border-[#F2EBF0] py-3.5 last:border-0"
            >
              <span className="w-[58px] shrink-0 text-[12.5px] tabular-nums text-muted-foreground">
                {formatoFechaSinAnio(e.fecha)}
              </span>
              <span className="w-[104px] shrink-0 text-[11px] font-bold tracking-[.07em] text-muted-foreground uppercase">
                {e.tipo}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-[1.5] text-pretty">{e.texto}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
