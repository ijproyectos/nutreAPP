"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedPaciente } from "@/lib/dal";

export type RegistroState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-081: formulario simple de autorregistro — descripción de comida +
 * ¿siguió el plan? y/o peso del día, van a registros_comida / mediciones
 * respectivamente. Cualquiera de los dos solo, o ambos juntos. */
export async function registrarComidaPeso(
  _prevState: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const { supabase, paciente } = await getAuthorizedPaciente();

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const siguioPlan = formData.get("siguio_plan") === "on";
  const pesoRaw = String(formData.get("peso") ?? "").trim();
  const peso = pesoRaw ? Number(pesoRaw) : null;

  if (!descripcion && !peso) {
    return { status: "error", error: "Cargá al menos la comida o el peso." };
  }
  if (pesoRaw && (peso === null || Number.isNaN(peso) || peso <= 0)) {
    return { status: "error", error: "El peso tiene que ser un número mayor a 0." };
  }

  if (descripcion) {
    const { error } = await supabase.from("registros_comida").insert({
      profesional_id: paciente.profesional_id,
      paciente_id: paciente.id,
      descripcion,
      adherencia: siguioPlan,
    });
    if (error) {
      console.error("[registrarComidaPeso] insert registros_comida falló:", error);
      return {
        status: "error",
        error: "No se pudo guardar el registro. Intentá de nuevo.",
      };
    }
  }

  if (peso !== null) {
    const { error } = await supabase.from("mediciones").insert({
      profesional_id: paciente.profesional_id,
      paciente_id: paciente.id,
      peso,
    });
    if (error) {
      console.error("[registrarComidaPeso] insert mediciones falló:", error);
      return {
        status: "error",
        error: "No se pudo guardar el peso. Intentá de nuevo.",
      };
    }
  }

  revalidatePath("/portal/registro");
  revalidatePath("/portal");
  return { status: "success" };
}
