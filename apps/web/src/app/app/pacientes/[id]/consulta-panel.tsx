"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatoFechaCorta, formatoFechaSinAnio, formatoMoneda } from "@/lib/format";
import { registrarMedicion, type RegistrarMedicionState } from "./historia-actions";
import { enviarDevolucion, guardarNotaHoy } from "./consulta-actions";
import { PesoChart } from "./peso-chart";

const registrarInicial: RegistrarMedicionState = { status: "idle" };

type Medicion = { id: string; fecha: string; peso: number | null };

export function ConsultaPanel({
  pacienteId,
  pacienteNombre,
  ultimaConsulta,
  notaHoyInicial,
  resumen,
  mediciones,
  adherencia21,
  planResumen,
  pendienteCobro,
}: {
  pacienteId: string;
  pacienteNombre: string;
  /** Último acordado ANTERIOR a hoy — "de qué veníamos". */
  ultimaConsulta: { acordado: string; fecha: string } | null;
  notaHoyInicial: string;
  resumen: {
    registrosHechos: number;
    registrosEsperados: number;
    deltaPesoMes: number | null;
  };
  mediciones: Medicion[];
  /** Últimos 21 días, más viejo primero — `registros_comida.adherencia`. */
  adherencia21: boolean[];
  planResumen: { existe: boolean; estado: "borrador_ia" | "editado_manual" | "enviado" | null };
  pendienteCobro: { monto: number; dias: number; telefono: string | null } | null;
}) {
  const [registrarState, registrarAction, registrarPending] = useActionState(
    registrarMedicion,
    registrarInicial
  );
  const [cargaAbierta, setCargaAbierta] = useState(false);
  const [nota, setNota] = useState(notaHoyInicial);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const notaGuardadaRef = useRef(notaHoyInicial);

  // Autoguardado con debounce — el "Notas de hoy" del mockup se guarda
  // solo mientras escribís, sin botón "Guardar" aparte (ese botón queda
  // para "Guardar y cerrar", que en la práctica es un no-op ya que el
  // autoguardado corre igual — se mantiene como affordance de "listo").
  useEffect(() => {
    if (nota === notaGuardadaRef.current) return;
    const timer = setTimeout(() => {
      setGuardando(true);
      guardarNotaHoy(pacienteId, nota).then((r) => {
        setGuardando(false);
        if (r.ok) notaGuardadaRef.current = nota;
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [nota, pacienteId]);

  async function handleEnviarDevolucion() {
    setEnviando(true);
    setErrorEnvio(null);
    const r = await enviarDevolucion(pacienteId, nota);
    setEnviando(false);
    if (r.status === "error") {
      setErrorEnvio(r.error);
      return;
    }
    setEnviado(true);
  }

  const pesosOrdenados = [...mediciones]
    .filter((m) => m.peso !== null)
    .reverse()
    .map((m) => m.peso as number);

  const estadoGuardado = guardando
    ? "Guardando…"
    : nota
      ? "Guardado"
      : "Se guarda solo mientras escribís";

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 max-w-[700px]">
        <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          De qué veníamos
        </p>
        {ultimaConsulta ? (
          <div className="mt-[9px] text-[15.5px] leading-[1.55] text-pretty">
            {ultimaConsulta.acordado || "Sin notas de esa consulta."}
            <span className="mt-1.5 block text-[13px] text-muted-foreground">
              Acordado el {formatoFechaCorta(ultimaConsulta.fecha)}.
            </span>
          </div>
        ) : (
          <p className="mt-[9px] text-[13.5px] text-muted-foreground">
            Todavía no hay una consulta anterior registrada.
          </p>
        )}

        <p className="pt-8 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Qué pasó desde entonces
        </p>
        <div className="mt-[11px] flex max-w-[58ch] flex-col gap-2.5 text-[14.5px] leading-[1.5]">
          <p className="tabular-nums">
            Registró comidas {resumen.registrosHechos} de {resumen.registrosEsperados} días.
          </p>
          {resumen.deltaPesoMes !== null && (
            <p className="tabular-nums">
              {resumen.deltaPesoMes < 0
                ? `Bajó ${Math.abs(resumen.deltaPesoMes).toFixed(1)} kg`
                : resumen.deltaPesoMes > 0
                  ? `Subió ${resumen.deltaPesoMes.toFixed(1)} kg`
                  : "Mantuvo el peso"}{" "}
              en el último mes.
            </p>
          )}
        </div>

        <div className="flex items-baseline gap-3 pt-8">
          <span className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Peso
          </span>
          <span className="text-[12.5px] text-muted-foreground">últimos registros</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCargaAbierta((v) => !v)}
            className="ml-auto"
          >
            Cargar medición
          </Button>
        </div>

        {cargaAbierta && (
          <form
            key={mediciones.length}
            action={registrarAction}
            className="mt-3.5 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-card p-4"
          >
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-muted-foreground">Peso (kg)</label>
              <input
                name="peso"
                type="number"
                step="0.1"
                min="1"
                placeholder="71,4"
                className="h-9 w-24 rounded-[9px] border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-muted-foreground">Fecha</label>
              <input
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-9 rounded-[9px] border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus:border-primary"
              />
            </div>
            <Button type="submit" size="sm" disabled={registrarPending} className="gap-1">
              <Plus className="size-3.5" />
              {registrarPending ? "Guardando…" : "Guardar medición"}
            </Button>
            {registrarState.status === "error" && (
              <p className="w-full text-xs text-destructive">{registrarState.error}</p>
            )}
          </form>
        )}

        <div className="pt-4">
          <PesoChart pesos={pesosOrdenados} />
        </div>

        <div className="flex flex-col pt-3">
          {mediciones.slice(0, 6).map((m, i) => {
            const anterior = mediciones[i + 1];
            const delta =
              m.peso != null && anterior?.peso != null ? m.peso - anterior.peso : null;
            return (
              <div
                key={m.id}
                className="flex items-baseline gap-3.5 border-b border-[#F2EBF0] py-2 text-[13.5px] tabular-nums last:border-0"
              >
                <span className="w-14 shrink-0 text-[12.5px] text-muted-foreground">
                  {formatoFechaSinAnio(m.fecha)}
                </span>
                <span className="w-16 shrink-0 font-semibold">
                  {m.peso != null ? `${m.peso}kg` : "—"}
                </span>
                {delta !== null && delta !== 0 && (
                  <span
                    className={`text-[12.5px] ${delta > 0 ? "text-destructive" : "text-positive-foreground"}`}
                  >
                    {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}kg
                  </span>
                )}
              </div>
            );
          })}
          {mediciones.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">Sin mediciones registradas.</p>
          )}
        </div>

        <p className="pt-8 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Notas de hoy
        </p>
        <textarea
          value={nota}
          onChange={(e) => {
            setNota(e.target.value);
            setEnviado(false);
          }}
          placeholder="Escribí lo que hablaron. Al terminar podés mandárselo como devolución por chat."
          rows={5}
          className="mt-2.5 w-full resize-y rounded-xl border border-input bg-background p-3.5 text-[14.5px] leading-[1.55] text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
        />
        <div className="flex flex-wrap items-center gap-3 pt-2.5">
          <span className="text-[12.5px] text-muted-foreground">{estadoGuardado}</span>
          {errorEnvio && <span className="text-[12.5px] text-destructive">{errorEnvio}</span>}
          <Button
            onClick={handleEnviarDevolucion}
            disabled={enviando || !nota.trim() || enviado}
            className="ml-auto"
          >
            {enviado ? "Enviado por chat" : enviando ? "Enviando…" : "Enviar como devolución"}
          </Button>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Plan vigente
        </p>
        {planResumen.existe ? (
          <>
            <p className="mt-2 text-[13.5px] font-semibold">
              {planResumen.estado === "enviado"
                ? "Enviado"
                : planResumen.estado === "borrador_ia"
                  ? "Borrador de IA sin enviar"
                  : "Editado, sin enviar"}
            </p>
            <Link
              href="?tab=plan"
              scroll={false}
              className="mt-1.5 inline-block text-[13px] font-bold text-primary hover:underline"
            >
              Ver plan →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-[13.5px] text-muted-foreground">Todavía no tiene un plan.</p>
            <Link
              href="?tab=plan"
              scroll={false}
              className="mt-1.5 inline-block text-[13px] font-bold text-primary hover:underline"
            >
              Armar uno →
            </Link>
          </>
        )}

        <p className="pt-7 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
          Adherencia
        </p>
        <div className="mt-2.5 flex flex-wrap gap-[3px]">
          {adherencia21.map((on, i) => (
            <span
              key={i}
              className="size-3.5 rounded-[3px]"
              style={{ background: on ? "var(--primary)" : "#EBE3EA" }}
            />
          ))}
        </div>
        <p className="mt-2 text-[12.5px] tabular-nums text-muted-foreground">
          {adherencia21.length} días · {adherencia21.filter(Boolean).length} con adherencia
        </p>

        {pendienteCobro && (
          <>
            <p className="pt-7 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
              Pendiente de cobro
            </p>
            <p className="mt-2 text-[13.5px] leading-[1.55] tabular-nums">
              <span className="font-semibold text-destructive">
                {formatoMoneda(pendienteCobro.monto)}
              </span>{" "}
              <span className="text-muted-foreground">· {pendienteCobro.dias} días</span>
            </p>
            <a
              href={
                pendienteCobro.telefono
                  ? `https://wa.me/${pendienteCobro.telefono.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola ${pacienteNombre}! Te escribo para recordarte el pago pendiente.`)}`
                  : `https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola ${pacienteNombre}! Te escribo para recordarte el pago pendiente.`)}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-[13px] font-bold text-primary hover:underline"
            >
              Enviar recordatorio →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
