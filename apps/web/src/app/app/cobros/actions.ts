"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type CrearCobroState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-070: alta manual de cobro. `consulta_id` es opcional (RF-070: "...
 * asociado opcionalmente a una consulta") — se relee que la consulta sea
 * de ese mismo paciente antes de guardarla, no se confía en el id que
 * venga del form (aunque el `<select>` del diálogo ya solo lista
 * consultas del paciente elegido, un FormData manipulado podría mandar
 * cualquier id). */
export async function crearCobro(
  _prevState: CrearCobroState,
  formData: FormData
): Promise<CrearCobroState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "").trim() || null;
  const consultaId = String(formData.get("consulta_id") ?? "").trim() || null;
  const servicioId = String(formData.get("servicio_id") ?? "").trim() || null;

  if (!pacienteId) {
    return { status: "error", error: "Elegí un paciente." };
  }
  const monto = Number(montoRaw);
  if (!montoRaw || Number.isNaN(monto) || monto <= 0) {
    return { status: "error", error: "El monto tiene que ser un número mayor a 0." };
  }

  const { data: pacientePropio } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();
  if (!pacientePropio) {
    return { status: "error", error: "Paciente inválido." };
  }

  if (consultaId) {
    const { data: consultaPropia } = await supabase
      .from("consultas")
      .select("id")
      .eq("id", consultaId)
      .eq("paciente_id", pacienteId)
      .maybeSingle();
    if (!consultaPropia) {
      return { status: "error", error: "Consulta inválida para ese paciente." };
    }
  }

  if (servicioId) {
    const { data: servicioPropio } = await supabase
      .from("servicios_precios")
      .select("id")
      .eq("id", servicioId)
      .eq("profesional_id", profesional.id)
      .maybeSingle();
    if (!servicioPropio) {
      return { status: "error", error: "Servicio inválido." };
    }
  }

  const { error } = await supabase.from("cobros").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    consulta_id: consultaId,
    servicio_id: servicioId,
    monto,
    fecha_vencimiento: fechaVencimiento,
  });

  if (error) {
    console.error("[crearCobro] insert falló:", error);
    return { status: "error", error: "No se pudo crear el cobro. Intentá de nuevo." };
  }

  revalidatePath("/app/cobros");
  revalidatePath("/app");
  return { status: "success" };
}

export type MarcarCobradoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-070: "marcar como cobrado". `.eq("profesional_id", ...)` es
 * redundante con la policy RLS (`cobros_update_profesional`), pero deja
 * la intención explícita en el código y evita un update silencioso de 0
 * filas si el id no fuera propio. */
export async function marcarCobrado(
  _prevState: MarcarCobradoState,
  formData: FormData
): Promise<MarcarCobradoState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const cobroId = String(formData.get("cobro_id") ?? "");
  if (!cobroId) {
    return { status: "error", error: "Cobro inválido." };
  }

  const { error } = await supabase
    .from("cobros")
    .update({ estado: "cobrado" })
    .eq("id", cobroId)
    .eq("profesional_id", profesional.id);

  if (error) {
    console.error("[marcarCobrado] update falló:", error);
    return { status: "error", error: "No se pudo marcar como cobrado. Intentá de nuevo." };
  }

  revalidatePath("/app/cobros");
  revalidatePath("/app");
  return { status: "success" };
}

/** Consultas del paciente elegido, para el `<select>` opcional de
 * "Asociar a una consulta" en NuevoCobroDialog — se releen server-side
 * cada vez que cambia el paciente seleccionado en el diálogo. */
export async function obtenerConsultasDePaciente(
  pacienteId: string
): Promise<{ id: string; fecha: string }[]> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  if (!pacienteId) return [];

  const { data, error } = await supabase
    .from("consultas")
    .select("id, fecha")
    .eq("paciente_id", pacienteId)
    .eq("profesional_id", profesional.id)
    .order("fecha", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[obtenerConsultasDePaciente] select falló:", error);
    return [];
  }

  return data ?? [];
}
