"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

type Frecuencia = "semanal" | "quincenal" | "mensual";

/** Avanza una fecha (YYYY-MM-DD) según la frecuencia — usa componentes
 * UTC (`Date.UTC`) para no correr un día por la zona horaria del server
 * (Netlify corre en UTC, mismo motivo que ya documenta turno-form-dialog.tsx
 * para fecha/hora de turnos, acá con fechas puras sin hora es más simple
 * pero el riesgo de "correrse un día" es el mismo si se usa el
 * constructor de Date local). */
function avanzarFecha(fecha: string, frecuencia: Frecuencia): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (frecuencia === "semanal") date.setUTCDate(date.getUTCDate() + 7);
  else if (frecuencia === "quincenal") date.setUTCDate(date.getUTCDate() + 15);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

// =========================================================
// planes_suscripcion — CRUD simple, mismo patrón que sedes/obras_sociales.
// =========================================================

export type CrearPlanSuscripcionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function crearPlanSuscripcion(
  _prevState: CrearPlanSuscripcionState,
  formData: FormData
): Promise<CrearPlanSuscripcionState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const frecuencia = String(formData.get("frecuencia") ?? "");

  if (!nombre) return { status: "error", error: "Ponele un nombre al plan." };
  const monto = Number(montoRaw);
  if (!montoRaw || Number.isNaN(monto) || monto <= 0) {
    return { status: "error", error: "El monto tiene que ser un número mayor a 0." };
  }
  if (!["semanal", "quincenal", "mensual"].includes(frecuencia)) {
    return { status: "error", error: "Elegí una frecuencia válida." };
  }

  const { error } = await supabase
    .from("planes_suscripcion")
    .insert({ profesional_id: profesional.id, nombre, monto, frecuencia });

  if (error) {
    console.error("[crearPlanSuscripcion] insert falló:", error);
    return { status: "error", error: "No se pudo crear el plan. Intentá de nuevo." };
  }

  revalidatePath("/app/cobros/suscripciones");
  return { status: "success" };
}

export type EliminarPlanState = { status: "success" } | { status: "error"; error: string };

export async function eliminarPlanSuscripcion(planId: string): Promise<EliminarPlanState> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("planes_suscripcion")
    .delete()
    .eq("id", planId)
    .eq("profesional_id", profesional.id);

  revalidatePath("/app/cobros/suscripciones");

  if (error) {
    console.error("[eliminarPlanSuscripcion] delete falló:", error);
    // Postgres código 23503 = violación de foreign key — el caso real acá
    // es "hay suscripciones (activas o no) usando este plan", por el FK
    // sin cascade/set null a propósito. Mensaje específico en vez del
    // genérico, porque la acción real (cancelar/borrar esas
    // suscripciones primero) es distinta a "reintentar".
    if (error.code === "23503") {
      return {
        status: "error",
        error: "Hay pacientes suscriptos a este plan — cancelá esas suscripciones primero.",
      };
    }
    return { status: "error", error: "No se pudo eliminar el plan. Intentá de nuevo." };
  }

  return { status: "success" };
}

// =========================================================
// suscripciones_pacientes
// =========================================================

export type CrearSuscripcionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function crearSuscripcion(
  _prevState: CrearSuscripcionState,
  formData: FormData
): Promise<CrearSuscripcionState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim() || null;

  if (!pacienteId) return { status: "error", error: "Elegí un paciente." };
  if (!planId) return { status: "error", error: "Elegí un plan." };

  const { data: pacientePropio } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();
  if (!pacientePropio) return { status: "error", error: "Paciente inválido." };

  const { data: planPropio } = await supabase
    .from("planes_suscripcion")
    .select("id")
    .eq("id", planId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();
  if (!planPropio) return { status: "error", error: "Plan inválido." };

  const inicio = fechaInicio ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("suscripciones_pacientes").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    plan_id: planId,
    fecha_inicio: inicio,
    proximo_vencimiento: inicio,
  });

  if (error) {
    console.error("[crearSuscripcion] insert falló:", error);
    return { status: "error", error: "No se pudo crear la suscripción. Intentá de nuevo." };
  }

  revalidatePath("/app/cobros/suscripciones");
  return { status: "success" };
}

export async function cambiarEstadoSuscripcion(
  suscripcionId: string,
  estado: "activa" | "pausada" | "cancelada"
): Promise<void> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("suscripciones_pacientes")
    .update({ estado })
    .eq("id", suscripcionId)
    .eq("profesional_id", profesional.id);
  if (error) {
    console.error("[cambiarEstadoSuscripcion] update falló:", error);
  }
  revalidatePath("/app/cobros/suscripciones");
}

export type GenerarCobroState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** El único paso "recurrente" de todo esto — explícito, un click por
 * cobro, nunca automático (sin cron en este proyecto). Relee la
 * suscripción + su plan antes de generar nada, y solo genera si sigue
 * activa y realmente vencida — evita un cobro fantasma si se hace doble
 * click justo cuando otro tab ya la avanzó. */
export async function generarCobroSuscripcion(suscripcionId: string): Promise<GenerarCobroState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data: suscripcion, error: suscripcionError } = await supabase
    .from("suscripciones_pacientes")
    .select("id, paciente_id, estado, proximo_vencimiento, planes_suscripcion(monto, frecuencia)")
    .eq("id", suscripcionId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();

  if (suscripcionError || !suscripcion) {
    console.error("[generarCobroSuscripcion] select falló:", suscripcionError);
    return { status: "error", error: "No se encontró la suscripción." };
  }
  if (suscripcion.estado !== "activa") {
    return { status: "error", error: "La suscripción no está activa." };
  }
  const hoy = new Date().toISOString().slice(0, 10);
  if (suscripcion.proximo_vencimiento > hoy) {
    return { status: "error", error: "Todavía no vence." };
  }

  const plan = suscripcion.planes_suscripcion as unknown as {
    monto: number;
    frecuencia: Frecuencia;
  } | null;
  if (!plan) {
    return { status: "error", error: "El plan de esta suscripción ya no existe." };
  }

  const { error: insertError } = await supabase.from("cobros").insert({
    profesional_id: profesional.id,
    paciente_id: suscripcion.paciente_id,
    suscripcion_id: suscripcion.id,
    monto: plan.monto,
    fecha_vencimiento: suscripcion.proximo_vencimiento,
  });

  if (insertError) {
    console.error("[generarCobroSuscripcion] insert de cobro falló:", insertError);
    return { status: "error", error: "No se pudo generar el cobro. Intentá de nuevo." };
  }

  const { error: updateError } = await supabase
    .from("suscripciones_pacientes")
    .update({ proximo_vencimiento: avanzarFecha(suscripcion.proximo_vencimiento, plan.frecuencia) })
    .eq("id", suscripcion.id);

  if (updateError) {
    // El cobro ya se generó — no falla la operación completa por esto,
    // pero el próximo vencimiento queda desactualizado hasta corregirlo
    // a mano. Se loguea para poder encontrarlo.
    console.error("[generarCobroSuscripcion] update de próximo vencimiento falló:", updateError);
  }

  revalidatePath("/app/cobros/suscripciones");
  revalidatePath("/app/cobros");
  revalidatePath("/app");
  return { status: "success" };
}
