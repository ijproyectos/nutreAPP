"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

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

  // Hallazgo del pre-commit-orchestrator: sin este chequeo, dos clicks
  // accidentales en "Nueva suscripción" para el mismo paciente/plan
  // crean dos filas independientes, cada una con su propio "Generar
  // cobro" — cobro recurrente duplicado de verdad, no solo una fila de
  // más. Bloquea solo la MISMA combinación paciente+plan ya activa; un
  // paciente en dos planes distintos sigue siendo un caso válido.
  const { data: yaSuscripto } = await supabase
    .from("suscripciones_pacientes")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("plan_id", planId)
    .eq("estado", "activa")
    .maybeSingle();
  if (yaSuscripto) {
    return { status: "error", error: "Este paciente ya tiene una suscripción activa a este plan." };
  }

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

// Textos de las excepciones que tira generar_cobro_suscripcion() —
// autoría propia (016_generar_cobro_suscripcion_rpc.sql), no un mensaje
// crudo de Postgres, así que es seguro mostrarlos tal cual. Cualquier
// otro error (conexión, algo inesperado) cae al genérico.
const MENSAJES_RPC_SEGUROS = new Set([
  "Suscripción no encontrada.",
  "La suscripción no está activa.",
  "Todavía no vence.",
  "El plan de esta suscripción ya no existe.",
]);

/** El único paso "recurrente" de todo esto — explícito, un click por
 * cobro, nunca automático (sin cron en este proyecto). Insert del cobro
 * + avance de `proximo_vencimiento` pasaron a una RPC transaccional
 * (`generar_cobro_suscripcion`, 016) con lock de fila — hallazgo
 * bloqueante del pre-commit-orchestrator: la versión anterior con dos
 * escrituras sueltas desde acá podía generar un cobro duplicado real,
 * tanto por reintento tras un fallo parcial como por una race condition
 * genuina entre dos clicks/tabs concurrentes. */
export async function generarCobroSuscripcion(suscripcionId: string): Promise<GenerarCobroState> {
  const { supabase } = await getAuthorizedProfesional();

  const { error } = await supabase.rpc("generar_cobro_suscripcion", {
    p_suscripcion_id: suscripcionId,
  });

  if (error) {
    console.error("[generarCobroSuscripcion] RPC falló:", error);
    return {
      status: "error",
      error: MENSAJES_RPC_SEGUROS.has(error.message)
        ? error.message
        : "No se pudo generar el cobro. Intentá de nuevo.",
    };
  }

  revalidatePath("/app/cobros/suscripciones");
  revalidatePath("/app/cobros");
  revalidatePath("/app");
  return { status: "success" };
}
