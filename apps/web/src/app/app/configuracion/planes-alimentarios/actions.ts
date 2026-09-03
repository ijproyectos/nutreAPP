"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarPlanesState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Se lee en pacientes/[id]/page.tsx para precargar "Escribir
 * manualmente" en PlanIAPanel — el profesional la sigue pudiendo editar
 * o borrar antes de guardar/enviar, esto es solo un punto de partida. */
export async function actualizarPlanes(
  _prevState: ActualizarPlanesState,
  formData: FormData
): Promise<ActualizarPlanesState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const plantilla = String(formData.get("plantilla_plan_alimentario") ?? "").trim();

  const { error } = await supabase
    .from("profesionales")
    .update({ plantilla_plan_alimentario: plantilla || null })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarPlanes] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/planes-alimentarios");
  // Consumidor real: PlanIAPanel en la ficha de CUALQUIER paciente — sin
  // un id concreto acá, mismo patrón ya usado en
  // onboarding/invitacion/[token]/wizard-actions.ts para el mismo caso
  // (revalidar un dynamic segment sin conocer el id puntual).
  revalidatePath("/app/pacientes/[id]", "page");
  return { status: "success" };
}
