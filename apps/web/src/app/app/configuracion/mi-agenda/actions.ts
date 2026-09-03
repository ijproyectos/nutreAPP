"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarMiAgendaState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Se lee en /app/agenda/page.tsx para precargar el tipo de turno al
 * crear uno nuevo (turno-form-dialog.tsx). No hay "duración por
 * defecto" — `turnos` no tiene columna de duración, ver
 * 013_configuracion_consultorio.sql. */
export async function actualizarMiAgenda(
  _prevState: ActualizarMiAgendaState,
  formData: FormData
): Promise<ActualizarMiAgendaState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const tipo = String(formData.get("tipo_turno_default") ?? "");
  if (tipo !== "presencial" && tipo !== "videollamada") {
    return { status: "error", error: "Elegí un tipo válido." };
  }

  const { error } = await supabase
    .from("profesionales")
    .update({ tipo_turno_default: tipo })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarMiAgenda] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/mi-agenda");
  revalidatePath("/app/agenda");
  return { status: "success" };
}
