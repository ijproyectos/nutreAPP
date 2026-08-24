"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuthorizedProfesional } from "@/lib/dal";
import { enviarInvitacionPaciente } from "@/lib/email/enviar";

export type CrearPacienteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; token: string; emailEnviado: boolean };

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
    console.error("[crearPaciente] invitar_paciente RPC falló:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      status: "error",
      error: "No se pudo crear el paciente. Intentá de nuevo.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  // Best-effort: el link para copiar/enviar a mano sigue siendo el camino
  // principal (RF-020) — el mail es un canal adicional, nunca bloqueante.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "http://localhost:3000";
  const link = `${origin}/onboarding/invitacion/${row.token}`;

  const resultado = await enviarInvitacionPaciente({
    email,
    nombrePaciente: nombre,
    link,
  });

  revalidatePath("/app/pacientes");

  return { status: "success", token: row.token, emailEnviado: resultado.enviado };
}
