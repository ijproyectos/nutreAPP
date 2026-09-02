"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedPaciente } from "@/lib/dal";

export type Seccion =
  | "datos_personales"
  | "contacto"
  | "antecedentes"
  | "habitos"
  | "consentimiento";

export type CompletarSeccionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-020 wizard de perfil (mockup "Lo llena el paciente"): guarda una
 * sección vía la RPC completar_seccion_perfil (009_rpc_perfil_paciente.sql)
 * — el paciente no tiene policy de update directa sobre `pacientes`
 * (decisión deliberada de 002_rls_policies.sql), la RPC es SECURITY
 * DEFINER con columnas whitelisteadas a mano por sección. Se llama por
 * paso, no una vez al final del wizard — si el paciente cierra el link a
 * mitad de camino, lo ya respondido queda guardado. */
export async function completarSeccionPerfil(
  seccion: Seccion,
  datos: Record<string, unknown>
): Promise<CompletarSeccionState> {
  const { supabase } = await getAuthorizedPaciente();

  const { error } = await supabase.rpc("completar_seccion_perfil", {
    p_seccion: seccion,
    p_datos: datos,
  });

  if (error) {
    console.error("[completarSeccionPerfil] RPC falló:", {
      seccion,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      status: "error",
      error: "No se pudo guardar. Intentá de nuevo.",
    };
  }

  // Para que la ficha del profesional (completitud + actividad del link)
  // refleje el avance apenas se guarda, no recién en la próxima carga.
  revalidatePath("/app/pacientes/[id]", "page");
  return { status: "success" };
}
