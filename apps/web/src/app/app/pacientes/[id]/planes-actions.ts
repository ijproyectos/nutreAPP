"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";
import { generarPlanConIA } from "@/lib/ai/generar-plan";
import { edadDesde } from "@/lib/format";

export type GenerarPlanState =
  | { status: "idle" }
  | { status: "error"; error: string; reintentable: boolean }
  | { status: "success" };

/** Botón "Generar plan con IA" en la ficha del paciente. Arma el prompt con
 *  los datos del paciente, la última medición y el laboratorio VALIDADO
 *  más reciente (nunca uno pendiente/rechazado). El resultado siempre
 *  entra como `borrador_ia` — nunca se envía solo, tiene que pasar por
 *  guardarPlan() con acción "enviar". */
export async function generarPlanIA(
  _prevState: GenerarPlanState,
  formData: FormData
): Promise<GenerarPlanState> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const pacienteId = String(formData.get("paciente_id") ?? "");

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, fecha_nacimiento")
    .eq("id", pacienteId)
    .maybeSingle();

  if (!paciente) {
    return { status: "error", error: "Paciente no encontrado.", reintentable: false };
  }

  const [{ data: medicion }, { data: laboratorio }] = await Promise.all([
    supabase
      .from("mediciones")
      .select("fecha, peso")
      .eq("paciente_id", pacienteId)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("laboratorios")
      .select("id, fecha_estudio, valores")
      .eq("paciente_id", pacienteId)
      .eq("estado", "validado")
      .order("fecha_estudio", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const resultado = await generarPlanConIA({
    paciente: { nombre: paciente.nombre, edad: edadDesde(paciente.fecha_nacimiento) },
    ultimaMedicion: medicion ? { fecha: medicion.fecha, peso: medicion.peso } : null,
    laboratorioValidado: laboratorio
      ? { fecha: laboratorio.fecha_estudio, valores: laboratorio.valores as Record<string, number> }
      : null,
  });

  if (!resultado.ok) {
    return { status: "error", error: resultado.error, reintentable: resultado.reintentable };
  }

  const { error: insertError } = await supabase.from("planes").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    contenido: resultado.contenido,
    estado: "borrador_ia",
    generado_con_ia: true,
    laboratorio_id: laboratorio?.id ?? null,
  });

  if (insertError) {
    return {
      status: "error",
      error: "El plan se generó pero no se pudo guardar. Reintentá.",
      reintentable: true,
    };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}

export type CrearPlanManualState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-060: crear un plan desde cero, sin pasar por la IA. Nace
 *  `editado_manual` directamente — nunca fue un borrador. */
export async function crearPlanManual(
  _prevState: CrearPlanManualState,
  formData: FormData
): Promise<CrearPlanManualState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!contenido) {
    return { status: "error", error: "El plan no puede quedar vacío." };
  }

  const { error } = await supabase.from("planes").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    contenido,
    estado: "editado_manual",
    generado_con_ia: false,
  });

  if (error) {
    return { status: "error", error: "No se pudo crear el plan. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}

export type GuardarPlanState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Guardar edición manual del plan (borrador o enviarlo). La validación
 *  humana pasa siempre por acá: nunca hay otro camino para que
 *  `estado = 'enviado'`. */
export async function guardarPlan(
  _prevState: GuardarPlanState,
  formData: FormData
): Promise<GuardarPlanState> {
  const { supabase } = await getAuthorizedProfesional();

  const planId = String(formData.get("plan_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const accion = String(formData.get("accion") ?? "guardar");

  if (!contenido) {
    return { status: "error", error: "El plan no puede quedar vacío." };
  }

  const update: { contenido: string; estado: string; enviado_at?: string } = {
    contenido,
    estado: "editado_manual",
  };
  if (accion === "enviar") {
    update.estado = "enviado";
    update.enviado_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("planes")
    .update(update)
    .eq("id", planId)
    .select("paciente_id")
    .single();

  if (error || !data) {
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${data.paciente_id}`);
  return { status: "success" };
}
