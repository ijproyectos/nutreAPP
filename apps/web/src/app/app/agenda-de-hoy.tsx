"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TurnoDeHoy } from "@/lib/queries/dashboard";

const ESTADO_ESTILO: Record<string, string> = {
  en_curso: "text-[#5A7645] bg-[#EDF1E7] border-[#C6CEB6]",
  confirmado: "text-muted-foreground bg-secondary border-border",
  pendiente: "text-muted-foreground bg-secondary border-border",
};

const ESTADO_LABEL: Record<string, string> = {
  en_curso: "En curso",
  confirmado: "Confirmado",
  pendiente: "Pendiente",
};

/** Rediseño visual de Inicio: cada turno del día se puede abrir para ver
 * el brief de continuidad inline, en vez de mostrarlo siempre destapado
 * solo para el turno en curso (como hacía la versión anterior). Un solo
 * turno abierto a la vez, arranca con el "en curso" ya abierto si existe. */
export function AgendaDeHoy({ turnos }: { turnos: TurnoDeHoy[] }) {
  const enCursoId = turnos.find((t) => t.estado === "en_curso")?.id ?? null;
  const [abiertoId, setAbiertoId] = useState<string | null>(enCursoId);

  if (turnos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No tenés turnos agendados para hoy.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {turnos.map((t, i) => {
        const abierto = abiertoId === t.id;
        return (
          <div key={t.id}>
            {i > 0 && <div className="my-1.5 h-px bg-border" />}
            <button
              type="button"
              onClick={() => setAbiertoId(abierto ? null : t.id)}
              className="-mx-3 flex w-[calc(100%+24px)] items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-secondary"
            >
              <span
                className={`size-[7px] shrink-0 rounded-full ${
                  t.estado === "en_curso"
                    ? "bg-primary shadow-[0_0_0_3px_#F1E9EF]"
                    : "border-[1.5px] border-[#C8BFC9] bg-white"
                }`}
              />
              <span className="w-[46px] shrink-0 text-[12.5px] font-bold tabular-nums">
                {new Date(t.fechaHora).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                {t.pacienteNombre}
              </span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-[.05em] uppercase ${ESTADO_ESTILO[t.estado] ?? ESTADO_ESTILO.pendiente}`}
              >
                {ESTADO_LABEL[t.estado] ?? t.estado}
              </span>
            </button>

            {abierto && (
              <div className="py-0.5 pl-[19px]">
                <span className="mb-1.5 inline-block rounded-full border border-accent bg-accent px-2.5 py-1 text-[11px] font-bold text-primary">
                  {t.tipo === "presencial" ? "Presencial" : "Videollamada"}
                </span>
                {t.brief ? (
                  <>
                    {t.brief.acordado && (
                      <div className="flex gap-3.5 border-t border-border py-2.5 text-[13px]">
                        <div className="w-[86px] shrink-0 pt-0.5 text-[10.5px] font-bold tracking-[.09em] text-muted-foreground uppercase">
                          Acordado
                        </div>
                        <div className="text-foreground">{t.brief.acordado}</div>
                      </div>
                    )}
                    {t.brief.completo && (
                      <div className="flex gap-3.5 border-t border-border py-2.5 text-[13px]">
                        <div className="w-[86px] shrink-0 pt-0.5 text-[10.5px] font-bold tracking-[.09em] text-muted-foreground uppercase">
                          Completó
                        </div>
                        <div className="text-foreground">{t.brief.completo}</div>
                      </div>
                    )}
                    {t.brief.cambio && (
                      <div className="flex gap-3.5 border-t border-border py-2.5 text-[13px]">
                        <div className="w-[86px] shrink-0 pt-0.5 text-[10.5px] font-bold tracking-[.09em] text-muted-foreground uppercase">
                          Cambió
                        </div>
                        <div className="text-foreground">{t.brief.cambio}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="border-t border-border py-2.5 text-[13px] text-muted-foreground">
                    Sin brief de continuidad todavía.
                  </p>
                )}
                <Link
                  href={`/app/pacientes/${t.pacienteId}`}
                  className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-accent bg-card py-2.5 text-[12.5px] font-bold text-primary transition-colors hover:bg-accent"
                >
                  Abrir ficha completa
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
