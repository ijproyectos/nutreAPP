"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type CrearPacienteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; token: string; pacienteId: string };

/** RF-020: alta de paciente + invitación, vía la RPC atómica
 * invitar_paciente (nombre/email/teléfono/fecha_nacimiento). Los campos
 * opcionales del mockup "Alta de paciente" → "Lo cargo yo" (DNI, obra
 * social, motivo de consulta, sede, quién derivó — 007/008 los agregó a
 * `pacientes`) no pasaron por la RPC para no tocar su firma ya aplicada
 * en producción: se cargan con un update aparte, autorizado por la misma
 * policy `pacientes_update_profesional` que ya usa el resto de la ficha.
 * Si ese segundo paso falla, no se aborta el alta — el paciente y la
 * invitación ya existen y son lo que importa; los campos opcionales se
 * pueden completar después a mano. */
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
  if (!row?.token || !row?.paciente_id) {
    console.error("[crearPaciente] invitar_paciente RPC no devolvió token:", data);
    return {
      status: "error",
      error: "El paciente se creó pero no se pudo generar la invitación. Revisalo en el listado.",
    };
  }

  const camposOpcionales: Record<string, string> = {};
  const dni = String(formData.get("dni") ?? "").trim();
  const obraSocial = String(formData.get("obra_social") ?? "").trim();
  const motivoConsulta = String(formData.get("motivo_consulta") ?? "").trim();
  const sede = String(formData.get("sede") ?? "").trim();
  const quienDerivo = String(formData.get("quien_derivo") ?? "").trim();
  if (dni) camposOpcionales.dni = dni;
  if (obraSocial) camposOpcionales.obra_social = obraSocial;
  if (motivoConsulta) camposOpcionales.motivo_consulta = motivoConsulta;
  if (sede) camposOpcionales.sede = sede;
  if (quienDerivo) camposOpcionales.quien_derivo = quienDerivo;

  if (Object.keys(camposOpcionales).length > 0) {
    const { error: updateError } = await supabase
      .from("pacientes")
      .update(camposOpcionales)
      .eq("id", row.paciente_id);
    if (updateError) {
      console.error(
        "[crearPaciente] update de campos opcionales falló:",
        updateError
      );
    }
  }

  revalidatePath("/app/pacientes");
  return { status: "success", token: row.token, pacienteId: row.paciente_id };
}

/** Log de "Actividad del link" (mockup "En la ficha") — se llama cuando el
 * profesional efectivamente abre WhatsApp para mandar (o reenviar) el
 * link. RPC en vez de insert directo porque valida el token y, si quien
 * llama es un profesional autenticado, que sea el dueño de esa
 * invitación (ver 009_rpc_perfil_paciente.sql). Nunca lanza — es
 * logging, no debe romper el flujo de invitar si falla. */
export async function registrarEnvioWhatsApp(token: string): Promise<void> {
  const { supabase } = await getAuthorizedProfesional();
  const { error } = await supabase.rpc("registrar_evento_invitacion", {
    p_token: token,
    p_tipo: "enviado_whatsapp",
  });
  if (error) {
    console.error("[registrarEnvioWhatsApp] RPC falló:", error);
  }
}
