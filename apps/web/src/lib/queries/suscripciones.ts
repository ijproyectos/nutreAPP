import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type PlanSuscripcion = {
  id: string;
  nombre: string;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual";
};

export async function obtenerPlanesSuscripcion(supabase: Client): Promise<PlanSuscripcion[]> {
  const { data, error } = await supabase
    .from("planes_suscripcion")
    .select("id, nombre, monto, frecuencia")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[obtenerPlanesSuscripcion] select falló:", error);
    return [];
  }
  return (data ?? []).map((p) => ({ ...p, monto: Number(p.monto) }));
}

export type SuscripcionPaciente = {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  planNombre: string;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual";
  estado: "activa" | "pausada" | "cancelada";
  proximoVencimiento: string;
  vencida: boolean;
};

/** Suscripciones de pacientes al profesional (cobro recurrente, sin RF
 * asignado). `vencida` se calcula acá, no se guarda — `estado === 'activa'
 * && proximo_vencimiento <= hoy`, lo que habilita el botón "Generar
 * cobro" en la UI. */
export async function obtenerSuscripciones(supabase: Client): Promise<SuscripcionPaciente[]> {
  const { data, error } = await supabase
    .from("suscripciones_pacientes")
    .select(
      "id, paciente_id, estado, proximo_vencimiento, pacientes(nombre), planes_suscripcion(nombre, monto, frecuencia)"
    )
    .order("proximo_vencimiento", { ascending: true });

  if (error) {
    console.error("[obtenerSuscripciones] select falló:", error);
    return [];
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (data ?? []).map((s) => {
    const plan = s.planes_suscripcion as unknown as {
      nombre: string;
      monto: number;
      frecuencia: "semanal" | "quincenal" | "mensual";
    } | null;
    return {
      id: s.id,
      pacienteId: s.paciente_id,
      pacienteNombre: (s.pacientes as unknown as { nombre: string } | null)?.nombre ?? "Paciente",
      planNombre: plan?.nombre ?? "Plan eliminado",
      monto: Number(plan?.monto ?? 0),
      frecuencia: plan?.frecuencia ?? "mensual",
      estado: s.estado,
      proximoVencimiento: s.proximo_vencimiento,
      vencida: s.estado === "activa" && s.proximo_vencimiento <= hoy,
    };
  });
}

/** Bandeja de hoy: cuántas suscripciones activas ya vencieron y siguen
 * sin su cobro del período generado. Reusa `obtenerSuscripciones` en vez
 * de una query aparte — es la misma lista, ya trae `vencida` calculado. */
export async function contarSuscripcionesVencidas(supabase: Client): Promise<number> {
  const suscripciones = await obtenerSuscripciones(supabase);
  return suscripciones.filter((s) => s.vencida).length;
}
