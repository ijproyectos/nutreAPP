"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarChatPortalState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Se lee en portal/chat/page.tsx — reemplaza el texto genérico del
 * chat 1:1 vacío del paciente. */
export async function actualizarChatPortal(
  _prevState: ActualizarChatPortalState,
  formData: FormData
): Promise<ActualizarChatPortalState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const mensaje = String(formData.get("mensaje_bienvenida_chat") ?? "").trim();

  const { error } = await supabase
    .from("profesionales")
    .update({ mensaje_bienvenida_chat: mensaje || null })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarChatPortal] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/chat-portal");
  return { status: "success" };
}
