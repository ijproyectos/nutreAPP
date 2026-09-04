"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

/** Guardado automático de "Notas de hoy" (tab Consulta) — se llama
 * seguido (debounced en el cliente, ver consulta-panel.tsx), por eso es
 * una función directa (no useActionState/form) que devuelve un booleano
 * simple en vez del discriminated union completo del resto del repo:
 * no hay una UI de error por intento, solo un indicador de "guardado"/
 * "sin guardar" que reintenta solo en el próximo tipeo.
 *
 * Escribe sobre la fila de `consultas` de HOY si ya existe (por ejemplo
 * porque Agenda ya generó una vía "Registrar brief" para el turno de
 * hoy) — así "De qué veníamos" (que lee el `acordado` más reciente) y
 * esto nunca compiten por filas separadas del mismo día. */
export async function guardarNotaHoy(
  pacienteId: string,
  texto: string
): Promise<{ ok: boolean }> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data: pacientePropio } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();
  if (!pacientePropio) return { ok: false };

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: existente, error: selectError } = await supabase
    .from("consultas")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("fecha", hoy)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selectError) {
    console.error("[guardarNotaHoy] select falló:", selectError);
    return { ok: false };
  }

  const { error } = existente
    ? await supabase.from("consultas").update({ acordado: texto }).eq("id", existente.id)
    : await supabase.from("consultas").insert({
        profesional_id: profesional.id,
        paciente_id: pacienteId,
        fecha: hoy,
        acordado: texto,
      });

  if (error) {
    console.error("[guardarNotaHoy] write falló:", error);
    return { ok: false };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { ok: true };
}

export type EnviarDevolucionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** "Guardar y enviar devolución" — no hay generación de PDF ni un canal
 * de "devolución" propio en este proyecto (ver CLAUDE.md, Configuración
 * → Plantillas de certificados: no hay infra de PDF). Se reusa el Chat
 * 1:1 ya construido — el resumen de la consulta llega como un mensaje
 * normal, el paciente lo ve donde ya mira todo lo demás. */
export async function enviarDevolucion(
  pacienteId: string,
  texto: string
): Promise<EnviarDevolucionState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  if (!texto.trim()) {
    return { status: "error", error: "Escribí algo antes de enviar." };
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

  const { error } = await supabase.from("mensajes").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    remitente: "profesional",
    contenido: `Resumen de la consulta de hoy:\n\n${texto.trim()}`,
  });

  if (error) {
    console.error("[enviarDevolucion] insert falló:", error);
    return { status: "error", error: "No se pudo enviar. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}
