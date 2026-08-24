"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type RevisarLaboratorioState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** El profesional valida o rechaza un laboratorio, pudiendo corregir los
 *  valores que detectó el parseo automático (o cargarlos a mano si no
 *  detectó nada). Solo un laboratorio `validado` puede usarse más
 *  adelante como input de un plan generado con IA. */
export async function revisarLaboratorio(
  _prevState: RevisarLaboratorioState,
  formData: FormData
): Promise<RevisarLaboratorioState> {
  const { supabase } = await getAuthorizedProfesional();

  const laboratorioId = String(formData.get("laboratorio_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notas = String(formData.get("notas_profesional") ?? "").trim();
  const valoresRaw = String(formData.get("valores") ?? "{}");

  if (decision !== "validado" && decision !== "rechazado") {
    return { status: "error", error: "Acción inválida." };
  }

  let valores: Record<string, number>;
  try {
    valores = JSON.parse(valoresRaw);
  } catch {
    return { status: "error", error: "Los valores cargados no son válidos." };
  }

  const { data, error } = await supabase
    .from("laboratorios")
    .update({
      estado: decision,
      valores,
      notas_profesional: notas || null,
    })
    .eq("id", laboratorioId)
    .select("paciente_id")
    .single();

  if (error || !data) {
    return {
      status: "error",
      error: "No se pudo guardar. Intentá de nuevo.",
    };
  }

  revalidatePath(`/app/pacientes/${data.paciente_id}`);
  revalidatePath("/app");
  return { status: "success" };
}
