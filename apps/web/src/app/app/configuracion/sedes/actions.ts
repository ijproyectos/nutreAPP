"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type AgregarSedeState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function agregarSede(
  _prevState: AgregarSedeState,
  formData: FormData
): Promise<AgregarSedeState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();

  if (!nombre) {
    return { status: "error", error: "Ponele un nombre a la sede." };
  }

  const { error } = await supabase
    .from("sedes")
    .insert({ profesional_id: profesional.id, nombre, direccion: direccion || null });

  if (error) {
    console.error("[agregarSede] insert falló:", error);
    return { status: "error", error: "No se pudo agregar la sede. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/sedes");
  return { status: "success" };
}

export async function eliminarSede(sedeId: string): Promise<void> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("sedes")
    .delete()
    .eq("id", sedeId)
    .eq("profesional_id", profesional.id);
  if (error) {
    console.error("[eliminarSede] delete falló:", error);
  }
  revalidatePath("/app/configuracion/sedes");
}
