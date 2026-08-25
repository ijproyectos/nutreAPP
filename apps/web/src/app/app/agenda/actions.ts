"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type TurnoFormState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

const ESTADOS = ["pendiente", "confirmado", "en_curso", "cancelado"] as const;
const TIPOS = ["presencial", "videollamada"] as const;

function parsearFechaHoraISO(valor: string): string | null {
  // El form manda un ISO ya calculado en el cliente (ver turno-form-dialog.tsx)
  // — reconstruir fecha+hora acá con new Date(`${fecha}T${hora}`) sería
  // interpretarlo en la zona horaria del server (Netlify corre en UTC), no
  // en la del profesional. Acá solo se valida que sea un ISO real.
  const d = new Date(valor);
  if (!valor || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** RF-030: crear turno. */
export async function crearTurno(
  _prevState: TurnoFormState,
  formData: FormData
): Promise<TurnoFormState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const fechaHora = parsearFechaHoraISO(String(formData.get("fecha_hora") ?? ""));
  const tipo = String(formData.get("tipo") ?? "presencial");
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!pacienteId) {
    return { status: "error", error: "Elegí un paciente." };
  }
  if (!fechaHora) {
    return { status: "error", error: "Fecha y hora inválidas." };
  }
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return { status: "error", error: "Tipo de turno inválido." };
  }

  const { error } = await supabase.from("turnos").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    fecha_hora: fechaHora,
    tipo,
    notas,
  });

  if (error) {
    console.error("[crearTurno] insert falló:", error);
    return { status: "error", error: "No se pudo crear el turno. Intentá de nuevo." };
  }

  revalidatePath("/app/agenda");
  revalidatePath("/app");
  revalidatePath("/app/pacientes");
  return { status: "success" };
}

/** RF-030: editar fecha/hora/tipo/notas — no reasigna el paciente. */
export async function editarTurno(
  _prevState: TurnoFormState,
  formData: FormData
): Promise<TurnoFormState> {
  const { supabase } = await getAuthorizedProfesional();

  const turnoId = String(formData.get("turno_id") ?? "");
  const fechaHora = parsearFechaHoraISO(String(formData.get("fecha_hora") ?? ""));
  const tipo = String(formData.get("tipo") ?? "presencial");
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!turnoId) return { status: "error", error: "Turno inválido." };
  if (!fechaHora) return { status: "error", error: "Fecha y hora inválidas." };
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return { status: "error", error: "Tipo de turno inválido." };
  }

  // RLS (turnos_update_profesional) es la barrera real acá: si el turno no
  // es de este profesional, el update no matchea ninguna fila — data queda
  // null sin necesidad de chequear el id contra profesional_id a mano.
  const { data, error } = await supabase
    .from("turnos")
    .update({ fecha_hora: fechaHora, tipo, notas })
    .eq("id", turnoId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[editarTurno] update falló:", error);
    return { status: "error", error: "No se pudo editar el turno. Intentá de nuevo." };
  }

  revalidatePath("/app/agenda");
  revalidatePath("/app");
  return { status: "success" };
}

/** RF-030: cambio de estado manual (incluye cancelar). */
export async function cambiarEstadoTurno(
  _prevState: TurnoFormState,
  formData: FormData
): Promise<TurnoFormState> {
  const { supabase } = await getAuthorizedProfesional();

  const turnoId = String(formData.get("turno_id") ?? "");
  const estado = String(formData.get("estado") ?? "");

  if (!turnoId || !ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
    return { status: "error", error: "Datos inválidos." };
  }

  const { data, error } = await supabase
    .from("turnos")
    .update({ estado })
    .eq("id", turnoId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[cambiarEstadoTurno] update falló:", error);
    return { status: "error", error: "No se pudo cambiar el estado. Intentá de nuevo." };
  }

  revalidatePath("/app/agenda");
  revalidatePath("/app");
  return { status: "success" };
}

export type BriefState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-032: brief de continuidad al cerrar una consulta — acordado / completó
 * / cambió, asociado al turno (turno_id nullable en `consultas` por si en
 * algún momento se quiere cargar uno suelto, sin turno). */
export async function registrarBrief(
  _prevState: BriefState,
  formData: FormData
): Promise<BriefState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const turnoId = String(formData.get("turno_id") ?? "") || null;
  const pacienteId = String(formData.get("paciente_id") ?? "");
  const acordado = String(formData.get("acordado") ?? "").trim() || null;
  const completo = String(formData.get("completo") ?? "").trim() || null;
  const cambio = String(formData.get("cambio") ?? "").trim() || null;

  if (!pacienteId) {
    return { status: "error", error: "Paciente inválido." };
  }
  if (!acordado && !completo && !cambio) {
    return { status: "error", error: "Cargá al menos un campo del brief." };
  }

  const { error } = await supabase.from("consultas").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    turno_id: turnoId,
    acordado,
    completo,
    cambio,
  });

  if (error) {
    console.error("[registrarBrief] insert falló:", error);
    return { status: "error", error: "No se pudo guardar el brief. Intentá de nuevo." };
  }

  revalidatePath("/app/agenda");
  revalidatePath("/app");
  return { status: "success" };
}
