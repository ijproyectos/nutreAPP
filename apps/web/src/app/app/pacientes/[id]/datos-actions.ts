"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type SeccionDatos = "contacto" | "personales" | "antecedentes" | "habitos";

const COLUMNA_COMPLETADO_AT: Record<SeccionDatos, string> = {
  contacto: "contacto_completado_at",
  personales: "datos_personales_completado_at",
  antecedentes: "antecedentes_completado_at",
  habitos: "habitos_completado_at",
};

export type ActualizarDatosState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Tab "Datos" — el profesional edita directamente lo que el paciente ya
 * cargó (o completa lo que falta). `pacientes_update_profesional` (002)
 * ya permite esto por RLS (a diferencia del paciente, que solo puede
 * escribir vía `completar_seccion_perfil`, ver 009); acá no hace falta
 * una RPC — es un `update` liso con columnas whitelisteadas a mano por
 * sección, nunca un update dinámico desde las claves del form (mismo
 * criterio que `completar_seccion_perfil`, aunque esa es SECURITY
 * DEFINER para el paciente y esta es un Server Action normal para el
 * profesional, que ya tiene permiso de fila completa).
 *
 * "Consentimiento" queda deliberadamente afuera — no es un dato que el
 * profesional deba poder marcar en nombre del paciente. */
export async function actualizarSeccionPerfil(
  _prevState: ActualizarDatosState,
  formData: FormData
): Promise<ActualizarDatosState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const seccion = String(formData.get("seccion") ?? "") as SeccionDatos;

  if (!pacienteId) {
    return { status: "error", error: "Paciente inválido." };
  }
  if (!(seccion in COLUMNA_COMPLETADO_AT)) {
    return { status: "error", error: "Sección inválida." };
  }

  const campo = (nombre: string) => {
    const v = String(formData.get(nombre) ?? "").trim();
    return v || null;
  };

  let datos: Record<string, string | null>;
  switch (seccion) {
    case "contacto":
      datos = {
        telefono: campo("telefono"),
        email: campo("email"),
        obra_social: campo("obra_social"),
      };
      break;
    case "personales":
      datos = {
        fecha_nacimiento: campo("fecha_nacimiento"),
        sexo_biologico: campo("sexo_biologico"),
        dni: campo("dni"),
        sede: campo("sede"),
        quien_derivo: campo("quien_derivo"),
        motivo_consulta: campo("motivo_consulta"),
      };
      break;
    case "antecedentes":
      datos = {
        condiciones: campo("condiciones"),
        alergias: campo("alergias"),
        medicacion: campo("medicacion"),
      };
      break;
    case "habitos":
      datos = {
        habitos_comidas: campo("habitos_comidas"),
        habitos_quien_cocina: campo("habitos_quien_cocina"),
        habitos_movimiento: campo("habitos_movimiento"),
      };
      break;
  }

  // Releer si la sección ya estaba marcada como completa — si el
  // profesional la completa por primera vez (estaba en null), se
  // estampa la fecha igual que si lo hubiera hecho el paciente. Si ya
  // tenía fecha, se conserva: no hay auditoría de "quién editó por
  // última vez", así que no tiene sentido pisarla en cada edición.
  const columnaCompletado = COLUMNA_COMPLETADO_AT[seccion];
  // Columnas fijas (no la variable `columnaCompletado`) en el .select():
  // el cliente de Supabase infiere tipos por literal de columna, un
  // string dinámico rompe esa inferencia.
  const { data: actual, error: selectError } = await supabase
    .from("pacientes")
    .select(
      "datos_personales_completado_at, contacto_completado_at, antecedentes_completado_at, habitos_completado_at"
    )
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();

  if (selectError || !actual) {
    console.error("[actualizarSeccionPerfil] select falló:", selectError);
    return { status: "error", error: "Paciente inválido." };
  }

  const yaCompleta = Boolean((actual as Record<string, unknown>)[columnaCompletado]);
  const update = yaCompleta ? datos : { ...datos, [columnaCompletado]: new Date().toISOString() };

  const { error } = await supabase
    .from("pacientes")
    .update(update)
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id);

  if (error) {
    console.error("[actualizarSeccionPerfil] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}
