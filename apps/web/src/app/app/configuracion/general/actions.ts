"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarGeneralState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** `profesionales.consultorio` ya existía desde 001 (se usa como
 * subtítulo del sidebar, ver app-shell.tsx) — esta pantalla es la
 * primera forma real de editarlo, antes solo se cargaba en el alta. */
export async function actualizarGeneral(
  _prevState: ActualizarGeneralState,
  formData: FormData
): Promise<ActualizarGeneralState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const consultorio = String(formData.get("consultorio") ?? "").trim();

  const { error } = await supabase
    .from("profesionales")
    .update({ consultorio: consultorio || null })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarGeneral] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/general");
  revalidatePath("/app", "layout");
  return { status: "success" };
}
