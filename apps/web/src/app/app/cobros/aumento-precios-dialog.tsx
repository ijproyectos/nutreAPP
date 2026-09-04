"use client";

import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { aplicarAumentoPrecios, obtenerCatalogoCompleto } from "./catalogo-actions";

const PORCENTAJES = [10, 15, 20, 25];
const ALCANCES = [
  { value: "todo", label: "Todo el catálogo" },
  { value: "consultas", label: "Solo consultas" },
  { value: "desactualizados", label: "Solo los desactualizados" },
] as const;

function pill(activo: boolean) {
  return activo
    ? "border-[#D8C4D6] bg-accent text-primary"
    : "border-input bg-background text-[#4C4455] hover:border-[#C8BFC9]";
}

function redondear(precio: number, pct: number) {
  return Math.round(((precio * (1 + pct / 100)) / 500)) * 500;
}

function whatsappHref(telefono: string | null, texto: string) {
  const mensaje = encodeURIComponent(texto);
  const numero = (telefono ?? "").replace(/[^\d]/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${mensaje}`
    : `https://api.whatsapp.com/send?text=${mensaje}`;
}

export function AumentoPreciosDialog({
  open,
  onOpenChange,
  pacientesActivos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacientesActivos: { id: string; nombre: string; telefono: string | null }[];
}) {
  const [catalogo, setCatalogo] = useState<
    { id: string; nombre: string; clase: string; precio: number; mesesDesdeActualizado: number }[] | null
  >(null);
  const [pct, setPct] = useState(15);
  const [pctLibre, setPctLibre] = useState("");
  const [alcance, setAlcance] = useState<(typeof ALCANCES)[number]["value"]>("todo");
  const [avisar, setAvisar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ cantidad: number } | null>(null);

  // Fetch al abrir, no en el cuerpo del efecto de forma síncrona — el
  // setState recién pasa en el .then(), mismo patrón que
  // nuevo-cobro-dialog.tsx (deep-link de Chats).
  useEffect(() => {
    if (open && catalogo === null) {
      obtenerCatalogoCompleto().then(setCatalogo);
    }
  }, [open, catalogo]);

  const pctLibreNum = Number(pctLibre.replace(/[^0-9]/g, ""));
  const pctActual = pctLibreNum > 0 ? pctLibreNum : pct;

  const soloDesactualizados = alcance === "desactualizados";
  const soloConsultas = alcance === "consultas";
  const alcanzados = (catalogo ?? []).filter((x) => {
    if (soloConsultas && x.clase === "producto") return false;
    if (soloDesactualizados && x.mesesDesdeActualizado < 4) return false;
    return true;
  });

  async function handleAplicar() {
    setEnviando(true);
    setError(null);
    const fd = new FormData();
    fd.set("pct", String(pctActual));
    fd.set("alcance", alcance);
    const r = await aplicarAumentoPrecios({ status: "idle" }, fd);
    setEnviando(false);
    if (r.status === "error") {
      setError(r.error);
      return;
    }
    if (r.status !== "success") return; // no debería pasar, conforma a TS
    setResultado({ cantidad: r.cantidad });
  }

  function cerrar() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-[22px] font-normal">
                Precios actualizados
              </DialogTitle>
              <DialogDescription>
                {pctActual}% sobre {resultado.cantidad}{" "}
                {resultado.cantidad === 1 ? "ítem" : "ítems"}. Rige para lo que agendes
                desde ahora.
              </DialogDescription>
            </DialogHeader>

            {avisar && pacientesActivos.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[12.5px] text-muted-foreground text-pretty">
                  No hay envío automático en bloque — abrí WhatsApp con cada paciente activo
                  para avisarle del precio nuevo:
                </p>
                <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-[11px] border border-border p-1.5">
                  {pacientesActivos.map((p) => (
                    <a
                      key={p.id}
                      href={whatsappHref(
                        p.telefono,
                        `Hola ${p.nombre}! Te aviso que actualizamos los precios de las consultas — rige desde ahora.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-muted"
                    >
                      <span className="truncate">{p.nombre}</span>
                      <MessageCircle className="size-4 shrink-0 text-[#5A7645]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-[22px] font-normal">
                Actualizar precios
              </DialogTitle>
              <DialogDescription>
                Un porcentaje a todo el catálogo, sin tocar servicio por servicio.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-[17px]">
              <div>
                <p className="pb-1.5 text-[11.5px] font-bold text-muted-foreground">Cuánto</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PORCENTAJES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPct(p);
                        setPctLibre("");
                      }}
                      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold tabular-nums transition-colors ${pill(!pctLibreNum && pct === p)}`}
                    >
                      {p}%
                    </button>
                  ))}
                  <span className="relative block w-[104px]">
                    <input
                      value={pctLibre}
                      onChange={(e) => setPctLibre(e.target.value)}
                      placeholder="otro"
                      className="h-9 w-full rounded-full border border-input bg-background py-0 pr-6 pl-3 text-[13px] tabular-nums text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted-foreground">
                      %
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <p className="pb-1.5 text-[11.5px] font-bold text-muted-foreground">Sobre qué</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALCANCES.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAlcance(a.value)}
                      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${pill(alcance === a.value)}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[minmax(0,1fr)_88px_20px_88px] items-center gap-2.5 border-b border-[#F2EBF0] bg-secondary px-3.5 py-2">
                  <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                    Servicio
                  </span>
                  <span className="text-right text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                    Hoy
                  </span>
                  <span />
                  <span className="text-right text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                    Queda
                  </span>
                </div>
                {catalogo === null && (
                  <p className="px-3.5 py-3 text-sm text-muted-foreground">Cargando…</p>
                )}
                {catalogo !== null && alcanzados.length === 0 && (
                  <p className="px-3.5 py-3 text-sm text-muted-foreground">
                    No hay nada para actualizar con ese alcance.
                  </p>
                )}
                {alcanzados.slice(0, 5).map((x) => (
                  <div
                    key={x.id}
                    className="grid grid-cols-[minmax(0,1fr)_88px_20px_88px] items-center gap-2.5 border-b border-[#F5EFF4] px-3.5 py-2 last:border-0"
                  >
                    <span className="min-w-0 truncate text-[13px]">{x.nombre}</span>
                    <span className="text-right text-[13px] tabular-nums text-muted-foreground">
                      ${x.precio.toLocaleString("es-AR")}
                    </span>
                    <ArrowRight className="size-3.5 justify-self-center text-[#C4B8C4]" />
                    <span className="text-right text-[13.5px] font-semibold tabular-nums">
                      ${redondear(x.precio, pctActual).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3.5 border-t border-[#F2EBF0] pt-[15px]">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">Avisar a los pacientes activos</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground text-pretty">
                    {avisar
                      ? "Te dejamos un link de WhatsApp listo por cada paciente activo."
                      : "Se enteran cuando se lo digas vos."}
                  </p>
                </div>
                <ToggleSwitch checked={avisar} onCheckedChange={setAvisar} label="Avisar a los pacientes activos" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="items-center gap-3 sm:justify-between">
              <p className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
                Se redondea a los $500 más cercanos.
              </p>
              <Button variant="outline" onClick={cerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                onClick={handleAplicar}
                disabled={enviando || alcanzados.length === 0 || pctActual <= 0}
              >
                {enviando ? "Aplicando…" : "Aplicar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
