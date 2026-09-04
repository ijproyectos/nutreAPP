"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatoFechaCorta } from "@/lib/format";
import { crearCobro, obtenerConsultasDePaciente } from "./actions";

// Handler manual (await directo) en vez de useActionState + <form
// action={fn}>, mismo motivo que NuevoGrupoDialog (módulo Chat): acá
// necesitamos cerrar el diálogo y limpiarlo justo cuando la action
// resuelve con éxito. Derivar `open` de un useActionState que persiste
// entre aperturas ("success" queda pegado) rompería el reabrir el
// diálogo la próxima vez sin un truco de key/remount — con await directo
// el cierre pasa en el mismo evento que originó el submit, sin ese
// problema.
export function NuevoCobroDialog({
  pacientes,
  pacienteIdInicial,
}: {
  pacientes: { id: string; nombre: string }[];
  /** /app/cobros?paciente=<id> — deep-link desde el chip "Cobrar" del
   * chat de un paciente (rediseño). Abre el diálogo con ese paciente
   * preseleccionado en vez de obligar a elegirlo de nuevo. */
  pacienteIdInicial?: string | null;
}) {
  const router = useRouter();
  // Lazy init (no useEffect) para abrir directo cuando llega ?paciente= —
  // así el único setState síncrono queda en el render inicial, no en un
  // efecto (ver el useEffect de abajo, que solo dispara el fetch de
  // consultas y limpia la URL).
  const [open, setOpen] = useState(() => !!pacienteIdInicial);
  const [pacienteId, setPacienteId] = useState(() => pacienteIdInicial ?? "");
  const [monto, setMonto] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [consultaId, setConsultaId] = useState("");
  const [consultas, setConsultas] = useState<{ id: string; fecha: string }[]>([]);
  const [cargandoConsultas, setCargandoConsultas] = useState(() => !!pacienteIdInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPacienteId("");
    setMonto("");
    setFechaVencimiento("");
    setConsultaId("");
    setConsultas([]);
    setError(null);
  }

  async function handlePacienteChange(id: string) {
    setPacienteId(id);
    setConsultaId("");
    setConsultas([]);
    if (!id) return;
    setCargandoConsultas(true);
    const propias = await obtenerConsultasDePaciente(id);
    setCargandoConsultas(false);
    setConsultas(propias);
  }

  // Deep-link desde /app/chats: `open`/`pacienteId`/`cargandoConsultas` ya
  // arrancan con el estado correcto (init perezoso arriba, no acá) — este
  // efecto solo dispara el fetch de sus consultas (setState recién en el
  // .then, no síncrono en el cuerpo del efecto) y limpia el query param
  // para que un refresh no vuelva a forzar nada.
  useEffect(() => {
    if (!pacienteIdInicial) return;
    router.replace("/app/cobros");
    obtenerConsultasDePaciente(pacienteIdInicial).then((propias) => {
      setCargandoConsultas(false);
      setConsultas(propias);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar con el id que trajo la navegación
  }, [pacienteIdInicial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.set("paciente_id", pacienteId);
    fd.set("monto", monto);
    fd.set("fecha_vencimiento", fechaVencimiento);
    fd.set("consulta_id", consultaId);

    const resultado = await crearCobro({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh(); // vuelve a pedir los datos server-rendered de la página (lista + resumen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button variant="default" className="gap-1.5" onClick={() => setOpen(true)}>
        <CircleDollarSign className="size-4" />
        Nuevo cobro
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cobro</DialogTitle>
          <DialogDescription>
            Queda en estado pendiente hasta que lo marques como cobrado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente_id">Paciente</Label>
            <select
              id="paciente_id"
              value={pacienteId}
              onChange={(e) => handlePacienteChange(e.target.value)}
              required
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Elegí un paciente…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              type="number"
              min="1"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha_vencimiento">
              Fecha de vencimiento <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="fecha_vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>

          {pacienteId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consulta_id">
                Asociar a una consulta <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <select
                id="consulta_id"
                value={consultaId}
                onChange={(e) => setConsultaId(e.target.value)}
                disabled={cargandoConsultas || consultas.length === 0}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">
                  {cargandoConsultas
                    ? "Cargando…"
                    : consultas.length === 0
                      ? "Sin consultas registradas"
                      : "Ninguna"}
                </option>
                {consultas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatoFechaCorta(c.fecha)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Creando…" : "Crear cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
