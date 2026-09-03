"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type AgregarObraSocialState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function agregarObraSocial(
  _prevState: AgregarObraSocialState,
  formData: FormData
): Promise<AgregarObraSocialState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { status: "error", error: "Ponele un nombre a la obra social." };
  }

  const { error } = await supabase
    .from("obras_sociales")
    .insert({ profesional_id: profesional.id, nombre });

  if (error) {
    console.error("[agregarObraSocial] insert falló:", error);
    return { status: "error", error: "No se pudo agregar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/obras-sociales");
  return { status: "success" };
}

export async function eliminarObraSocial(id: string): Promise<void> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("obras_sociales")
    .delete()
    .eq("id", id)
    .eq("profesional_id", profesional.id);
  if (error) {
    console.error("[eliminarObraSocial] delete falló:", error);
  }
  revalidatePath("/app/configuracion/obras-sociales");
}
