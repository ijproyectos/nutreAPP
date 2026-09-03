"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarComunicacionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Se leen en pacientes/nuevo/page.tsx (WhatsApp de invitación) y
 * recordatorio-actions.ts (email de recordatorio de turno). Vacío =
 * usar el texto por defecto de siempre (ver textoInvitacion() en
 * alta-paciente-view.tsx y enviarRecordatorioTurno() en
 * lib/email/enviar.ts). */
export async function actualizarComunicacion(
  _prevState: ActualizarComunicacionState,
  formData: FormData
): Promise<ActualizarComunicacionState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const plantillaInvitacion = String(formData.get("plantilla_invitacion_whatsapp") ?? "").trim();
  const plantillaRecordatorio = String(formData.get("plantilla_recordatorio_email") ?? "").trim();

  const { error } = await supabase
    .from("profesionales")
    .update({
      plantilla_invitacion_whatsapp: plantillaInvitacion || null,
      plantilla_recordatorio_email: plantillaRecordatorio || null,
    })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarComunicacion] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/comunicacion");
  return { status: "success" };
}
