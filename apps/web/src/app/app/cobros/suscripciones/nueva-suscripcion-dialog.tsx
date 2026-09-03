"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import type { PlanSuscripcion } from "@/lib/queries/suscripciones";
import { crearSuscripcion } from "./actions";

// Handler manual + router.refresh(), mismo motivo que NuevoCobroDialog
// (módulo Cobros): reabrir el diálogo con un useActionState cuyo `open`
// dependiera de state.status quedaría pegado en "success".
export function NuevaSuscripcionDialog({
  pacientes,
  planes,
}: {
  pacientes: { id: string; nombre: string }[];
  planes: PlanSuscripcion[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [planId, setPlanId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPacienteId("");
    setPlanId("");
    setFechaInicio("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const fd = new FormData();
    fd.set("paciente_id", pacienteId);
    fd.set("plan_id", planId);
    fd.set("fecha_inicio", fechaInicio);

    const resultado = await crearSuscripcion({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
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
        <UserPlus className="size-4" />
        Nueva suscripción
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva suscripción</DialogTitle>
          <DialogDescription>
            El primer cobro se genera desde la fecha de inicio, con el
            botón &quot;Generar cobro&quot; cuando venza.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente_id">Paciente</Label>
            <select
              id="paciente_id"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
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
            <Label htmlFor="plan_id">Plan</Label>
            <select
              id="plan_id"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              disabled={planes.length === 0}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">
                {planes.length === 0 ? "Creá un plan primero" : "Elegí un plan…"}
              </option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha_inicio">
              Fecha de inicio <span className="text-muted-foreground">(hoy si la dejás vacía)</span>
            </Label>
            <Input
              id="fecha_inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enviando || planes.length === 0}>
              {enviando ? "Creando…" : "Crear suscripción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
