"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type RegistrarMedicionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-022: carga de peso desde la ficha — es el único lado con datos
 *  reales posibles hoy (no hay Agenda todavía para generar turnos). */
export async function registrarMedicion(
  _prevState: RegistrarMedicionState,
  formData: FormData
): Promise<RegistrarMedicionState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const fecha = String(formData.get("fecha") ?? "").trim();
  const pesoRaw = String(formData.get("peso") ?? "").trim();
  const peso = pesoRaw ? Number(pesoRaw) : null;

  if (!pacienteId || !fecha) {
    return { status: "error", error: "Falta la fecha." };
  }
  if (peso === null || Number.isNaN(peso) || peso <= 0) {
    return { status: "error", error: "El peso tiene que ser un número mayor a 0." };
  }

  const { error } = await supabase.from("mediciones").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    fecha,
    peso,
  });

  if (error) {
    return { status: "error", error: "No se pudo guardar la medición. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}

export type GuardarNotasState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-022: notas generales del profesional sobre el paciente (alergias,
 *  preferencias, lo que sea) — nunca visibles para el paciente, ver el
 *  trade-off de RLS documentado en 007_historia_clinica.sql. */
export async function guardarNotas(
  _prevState: GuardarNotasState,
  formData: FormData
): Promise<GuardarNotasState> {
  const { supabase } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const notas = String(formData.get("notas") ?? "").trim();

  if (!pacienteId) {
    return { status: "error", error: "Paciente inválido." };
  }

  const { error } = await supabase
    .from("pacientes")
    .update({ notas_generales: notas || null })
    .eq("id", pacienteId);

  if (error) {
    return { status: "error", error: "No se pudieron guardar las notas. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}
