"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type CrearPacienteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; token: string };

/** RF-020: alta de paciente + invitación, vía la RPC atómica invitar_paciente. */
export async function crearPaciente(
  _prevState: CrearPacienteState,
  formData: FormData
): Promise<CrearPacienteState> {
  const { supabase } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const fechaNacimiento =
    String(formData.get("fecha_nacimiento") ?? "").trim() || null;

  if (!nombre || !email) {
    return { status: "error", error: "Nombre y email son obligatorios." };
  }

  const { data, error } = await supabase.rpc("invitar_paciente", {
    p_nombre: nombre,
    p_email: email,
    p_telefono: telefono,
    p_fecha_nacimiento: fechaNacimiento,
  });

  if (error) {
    return {
      status: "error",
      error: "No se pudo crear el paciente. Intentá de nuevo.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/app/pacientes");

  return { status: "success", token: row.token };
}
