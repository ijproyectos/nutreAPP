"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedPaciente } from "@/lib/dal";

export type ConfirmarTurnoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-082/031: el paciente confirma su turno pendiente vía la RPC
 * confirmar_turno — la RPC es la única barrera que importa (solo permite
 * pendiente -> confirmado, y solo sobre un turno propio), no hace falta
 * releer nada acá antes de llamarla. */
export async function confirmarTurnoPaciente(
  _prevState: ConfirmarTurnoState,
  formData: FormData
): Promise<ConfirmarTurnoState> {
  const { supabase } = await getAuthorizedPaciente();

  const turnoId = String(formData.get("turno_id") ?? "");
  if (!turnoId) {
    return { status: "error", error: "Turno inválido." };
  }

  const { error } = await supabase.rpc("confirmar_turno", { p_turno_id: turnoId });

  if (error) {
    console.error("[confirmarTurnoPaciente] RPC falló:", error);
    return {
      status: "error",
      error: "No se pudo confirmar el turno. Intentá de nuevo.",
    };
  }

  revalidatePath("/portal/turnos");
  revalidatePath("/portal");
  return { status: "success" };
}
