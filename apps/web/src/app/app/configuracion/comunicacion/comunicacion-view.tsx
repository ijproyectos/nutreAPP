"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actualizarComunicacion, type ActualizarComunicacionState } from "./actions";

const initialState: ActualizarComunicacionState = { status: "idle" };

export function ComunicacionView({
  valoresIniciales,
}: {
  valoresIniciales: {
    plantillaInvitacion: string;
    plantillaRecordatorio: string;
  };
}) {
  const [state, formAction, pending] = useActionState(actualizarComunicacion, initialState);
  const [plantillaInvitacion, setPlantillaInvitacion] = useState(
    valoresIniciales.plantillaInvitacion
  );
  const [plantillaRecordatorio, setPlantillaRecordatorio] = useState(
    valoresIniciales.plantillaRecordatorio
  );

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Comunicación</h2>
        <p className="text-sm text-muted-foreground">
          Plantillas para los mensajes que ya manda NutrIA. Dejalas en
          blanco para usar el texto por defecto.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="plantilla_invitacion_whatsapp">
            Invitación a paciente por WhatsApp
          </Label>
          <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
            Variables: <code>{"{nombre}"}</code> del paciente,{" "}
            <code>{"{profesional}"}</code> tu nombre. El link se agrega solo
            al final.
          </p>
          <Textarea
            id="plantilla_invitacion_whatsapp"
            name="plantilla_invitacion_whatsapp"
            rows={3}
            value={plantillaInvitacion}
            onChange={(e) => setPlantillaInvitacion(e.target.value)}
            placeholder="Hola {nombre}! Soy {profesional}. Te dejo el link para sumarte a NutrIA:"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="plantilla_recordatorio_email">
            Recordatorio de turno por email
          </Label>
          <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
            Variables: <code>{"{nombre}"}</code> del paciente,{" "}
            <code>{"{fecha}"}</code> del turno.
          </p>
          <Textarea
            id="plantilla_recordatorio_email"
            name="plantilla_recordatorio_email"
            rows={3}
            value={plantillaRecordatorio}
            onChange={(e) => setPlantillaRecordatorio(e.target.value)}
            placeholder="Te recordamos tu turno del {fecha}. Si todavía no lo confirmaste, avisanos."
          />
        </div>

        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.status === "success" && <p className="text-sm text-primary">Guardado.</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
