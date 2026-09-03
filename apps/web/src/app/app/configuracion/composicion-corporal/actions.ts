"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarMetricasState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

const MAX_METRICAS = 20;

/** Solo el catálogo — todavía no wireado a Historia Clínica/Mediciones
 * (que hoy solo cargan peso). Usar estas métricas ahí es un follow-up
 * aparte: tocaría el form de mediciones y el sparkline ya construidos,
 * más grande que "agregar una pantalla de Configuración". */
export async function actualizarMetricas(
  _prevState: ActualizarMetricasState,
  formData: FormData
): Promise<ActualizarMetricasState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const metricas = formData
    .getAll("metricas")
    .map(String)
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, MAX_METRICAS);

  const { error } = await supabase
    .from("profesionales")
    .update({ metricas_personalizadas: metricas })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarMetricas] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/composicion-corporal");
  return { status: "success" };
}
