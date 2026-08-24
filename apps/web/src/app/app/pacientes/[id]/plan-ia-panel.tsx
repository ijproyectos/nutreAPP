"use client";

import { useActionState, useState } from "react";
import { Sparkles, RotateCcw, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { tiempoRelativo } from "@/lib/format";
import {
  generarPlanIA,
  guardarPlan,
  crearPlanManual,
  type GenerarPlanState,
  type GuardarPlanState,
  type CrearPlanManualState,
} from "./planes-actions";

const generarInicial: GenerarPlanState = { status: "idle" };
const guardarInicial: GuardarPlanState = { status: "idle" };
const crearManualInicial: CrearPlanManualState = { status: "idle" };

type PlanActivo = {
  id: string;
  contenido: string;
  estado: "borrador_ia" | "editado_manual";
  generado_con_ia: boolean;
};

export function PlanIAPanel({
  pacienteId,
  planActivo,
  planesEnviados,
}: {
  pacienteId: string;
  planActivo: PlanActivo | null;
  planesEnviados: { id: string; enviado_at: string }[];
}) {
  const [generarState, generarAction, generarPending] = useActionState(
    generarPlanIA,
    generarInicial
  );
  const [guardarState, guardarAction, guardarPending] = useActionState(
    guardarPlan,
    guardarInicial
  );
  const [crearManualState, crearManualAction, crearManualPending] =
    useActionState(crearPlanManual, crearManualInicial);
  const [contenido, setContenido] = useState(planActivo?.contenido ?? "");
  const [escribiendoManual, setEscribiendoManual] = useState(false);
  const [contenidoManual, setContenidoManual] = useState("");

  if (!planActivo) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
        <p className="text-sm text-muted-foreground">
          Este paciente no tiene un plan en curso.
        </p>

        {!escribiendoManual ? (
          <div className="flex flex-wrap gap-2">
            <form action={generarAction}>
              <input type="hidden" name="paciente_id" value={pacienteId} />
              <Button
                type="submit"
                disabled={generarPending}
                className="gap-1.5"
              >
                <Sparkles className="size-4" />
                {generarPending ? "Generando…" : "Generar plan con IA"}
              </Button>
            </form>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEscribiendoManual(true)}
            >
              <PenLine className="size-4" />
              Escribir manualmente
            </Button>
          </div>
        ) : (
          <form action={crearManualAction} className="flex flex-col gap-3">
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <Textarea
              name="contenido"
              value={contenidoManual}
              onChange={(e) => setContenidoManual(e.target.value)}
              rows={12}
              placeholder="Escribí el plan acá — texto o markdown."
              className="font-mono text-sm"
              autoFocus
            />
            {crearManualState.status === "error" && (
              <p className="text-sm text-destructive">
                {crearManualState.error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={crearManualPending}>
                {crearManualPending ? "Creando…" : "Crear plan"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEscribiendoManual(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {generarState.status === "error" && (
          <p className="text-sm text-destructive">{generarState.error}</p>
        )}

        {planesEnviados.length > 0 && (
          <PlanesEnviados planes={planesEnviados} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          className={
            planActivo.estado === "borrador_ia"
              ? "border-transparent bg-accent text-accent-foreground"
              : "border-transparent bg-secondary text-secondary-foreground"
          }
        >
          {planActivo.estado === "borrador_ia"
            ? "Borrador generado con IA"
            : "Editado, sin enviar"}
        </Badge>
        {planActivo.generado_con_ia && (
          <form action={generarAction}>
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={generarPending}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              {generarPending ? "Regenerando…" : "Regenerar con IA"}
            </Button>
          </form>
        )}
      </div>

      {generarState.status === "error" && (
        <p className="text-sm text-destructive">{generarState.error}</p>
      )}

      <form action={guardarAction} className="flex flex-col gap-3">
        <input type="hidden" name="plan_id" value={planActivo.id} />
        <Textarea
          name="contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={16}
          className="font-mono text-sm"
        />
        {guardarState.status === "error" && (
          <p className="text-sm text-destructive">{guardarState.error}</p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            name="accion"
            value="guardar"
            variant="outline"
            disabled={guardarPending}
          >
            {guardarPending ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button
            type="submit"
            name="accion"
            value="enviar"
            disabled={guardarPending}
          >
            Enviar al paciente
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          El paciente no ve nada de esto hasta que toques &quot;Enviar al
          paciente&quot;.
        </p>
      </form>

      {planesEnviados.length > 0 && <PlanesEnviados planes={planesEnviados} />}
    </div>
  );
}

function PlanesEnviados({
  planes,
}: {
  planes: { id: string; enviado_at: string }[];
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        PLANES ENVIADOS ANTERIORMENTE
      </p>
      {planes.map((p) => (
        <p key={p.id} className="text-sm text-muted-foreground">
          Enviado {tiempoRelativo(p.enviado_at)}
        </p>
      ))}
    </div>
  );
}
