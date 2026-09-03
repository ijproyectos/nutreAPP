"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, X, Zap } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatoMoneda, formatoFechaCorta } from "@/lib/format";
import type { SuscripcionPaciente } from "@/lib/queries/suscripciones";
import { cambiarEstadoSuscripcion, generarCobroSuscripcion } from "./actions";

const ESTADO_ESTILO: Record<string, string> = {
  activa: "border-transparent bg-emerald-100 text-emerald-800",
  pausada: "border-transparent bg-accent text-accent-foreground",
  cancelada: "border-transparent bg-muted text-muted-foreground",
};

const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

export function SuscripcionesLista({
  suscripciones,
}: {
  suscripciones: SuscripcionPaciente[];
}) {
  const router = useRouter();
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({});

  // cambiarEstadoSuscripcion/generarCobroSuscripcion se llaman directo
  // (no vía <form action={fn}>), así que necesitan router.refresh() para
  // que la tabla ya montada refleje el cambio — mismo patrón ya validado
  // en Cobros y en los catálogos de esta misma sección.
  async function handleGenerarCobro(id: string) {
    setCargandoId(id);
    const resultado = await generarCobroSuscripcion(id);
    setCargandoId(null);
    if (resultado.status === "error") {
      setErrorPorId((prev) => ({ ...prev, [id]: resultado.error }));
      return;
    }
    router.refresh();
  }

  async function handleCambiarEstado(id: string, estado: "activa" | "pausada" | "cancelada") {
    setCargandoId(id);
    await cambiarEstadoSuscripcion(id, estado);
    setCargandoId(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paciente</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Próximo vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suscripciones.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Todavía no hay ninguna suscripción.
              </TableCell>
            </TableRow>
          )}
          {suscripciones.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.pacienteNombre}</TableCell>
              <TableCell>
                {s.planNombre} · {formatoMoneda(s.monto)}
              </TableCell>
              <TableCell>
                {formatoFechaCorta(s.proximoVencimiento)}
                {s.vencida && (
                  <Badge className="ml-2 border-transparent bg-destructive/10 text-destructive">
                    Vencida
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge className={ESTADO_ESTILO[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    {s.vencida && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="gap-1"
                        disabled={cargandoId === s.id}
                        onClick={() => handleGenerarCobro(s.id)}
                      >
                        <Zap className="size-3.5" />
                        Generar cobro
                      </Button>
                    )}
                    {s.estado === "activa" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={cargandoId === s.id}
                        onClick={() => handleCambiarEstado(s.id, "pausada")}
                      >
                        <Pause className="size-3.5" />
                        Pausar
                      </Button>
                    )}
                    {s.estado === "pausada" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={cargandoId === s.id}
                        onClick={() => handleCambiarEstado(s.id, "activa")}
                      >
                        <Play className="size-3.5" />
                        Reactivar
                      </Button>
                    )}
                    {s.estado !== "cancelada" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={cargandoId === s.id}
                        onClick={() => handleCambiarEstado(s.id, "cancelada")}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  {errorPorId[s.id] && (
                    <p className="text-xs text-destructive">{errorPorId[s.id]}</p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
