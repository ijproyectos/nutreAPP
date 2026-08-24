"use server";

import { getAuthorizedProfesional } from "@/lib/dal";
import { enviarRecordatorioTurno } from "@/lib/email/enviar";

export type RecordarTurnoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-042: botón "recordar" manual sobre un turno sin confirmar — sin
 * cron, un mail puntual disparado por el profesional. El turno se
 * vuelve a leer acá (no se confía en lo que mande el form) para que la
 * RLS de `turnos` siga siendo la única fuente de autorización. */
export async function recordarTurno(
  _prevState: RecordarTurnoState,
  formData: FormData
): Promise<RecordarTurnoState> {
  const { supabase } = await getAuthorizedProfesional();

  const turnoId = String(formData.get("turno_id") ?? "");
  if (!turnoId) {
    return { status: "error", error: "Falta el turno." };
  }

  const { data: turno, error } = await supabase
    .from("turnos")
    .select("fecha_hora, pacientes(nombre, email)")
    .eq("id", turnoId)
    .single();

  if (error || !turno) {
    return { status: "error", error: "No se encontró el turno." };
  }

  const paciente = turno.pacientes as unknown as {
    nombre: string;
    email: string;
  } | null;

  if (!paciente?.email) {
    return { status: "error", error: "El paciente no tiene email cargado." };
  }

  const resultado = await enviarRecordatorioTurno({
    email: paciente.email,
    nombrePaciente: paciente.nombre,
    fechaHora: turno.fecha_hora,
  });

  if (!resultado.enviado) {
    return {
      status: "error",
      error: resultado.error ?? "No se pudo enviar el recordatorio.",
    };
  }

  return { status: "success" };
}
