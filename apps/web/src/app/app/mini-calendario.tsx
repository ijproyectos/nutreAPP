import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiaCalendario } from "@/lib/queries/calendario";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

function mesAdyacente(mes: string, delta: number): string {
  const [anio, mesNum] = mes.split("-").map(Number);
  const d = new Date(anio, mesNum - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MiniCalendario({
  mes,
  dias,
  hoy,
}: {
  /** YYYY-MM */
  mes: string;
  dias: Map<string, DiaCalendario>;
  /** YYYY-MM-DD de hoy, para resaltar el día actual. */
  hoy: string;
}) {
  const [anio, mesNum] = mes.split("-").map(Number);
  const primerDia = new Date(anio, mesNum - 1, 1);
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  // Lunes = 0 ... domingo = 6 (getDay() da domingo=0, lo rotamos).
  const offset = (primerDia.getDay() + 6) % 7;

  const celdas: { fecha: string | null; dia: number | null }[] = [];
  for (let i = 0; i < offset; i++) celdas.push({ fecha: null, dia: null });
  for (let d = 1; d <= ultimoDia; d++) {
    celdas.push({ fecha: `${anio}-${String(mesNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dia: d });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 pb-3 shadow-[0_1px_2px_rgba(36,28,44,.04)]">
      <div className="mb-3.5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Calendario
          </p>
          <p className="mt-1 font-heading text-[19px]">
            {MESES[mesNum - 1]} {anio}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={`/app?mes=${mesAdyacente(mes, -1)}`}
            className="flex size-[30px] items-center justify-center rounded-[9px] border border-input text-muted-foreground transition-colors hover:border-[#C8BFC9] hover:bg-background"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
          <Link
            href={`/app?mes=${mesAdyacente(mes, 1)}`}
            className="flex size-[30px] items-center justify-center rounded-[9px] border border-input text-muted-foreground transition-colors hover:border-[#C8BFC9] hover:bg-background"
          >
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="pb-0.5 text-center text-[10px] font-bold tracking-[.09em] text-[#BAB2BE] uppercase"
          >
            {d}
          </div>
        ))}
        {celdas.map((c, i) => {
          if (!c.fecha) return <div key={i} />;
          const info = dias.get(c.fecha);
          const esHoy = c.fecha === hoy;
          return (
            <div
              key={c.fecha}
              className={`flex flex-col items-center gap-1 rounded-[9px] py-1.5 text-[12.5px] tabular-nums ${
                esHoy
                  ? "font-bold text-primary shadow-[inset_0_0_0_1.5px_#5C3A5E]"
                  : "font-medium text-[#4C4455]"
              }`}
            >
              {c.dia}
              <span
                className="size-1 rounded-full"
                style={{
                  background: info?.sinConfirmar
                    ? "#C4792F"
                    : info?.conTurnos
                      ? "#5C3A5E"
                      : "transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-[5px] rounded-full bg-primary" />
          Con turnos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[5px] rounded-full bg-[#C4792F]" />
          Sin confirmar
        </span>
      </div>
    </div>
  );
}
