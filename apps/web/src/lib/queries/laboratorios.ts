import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type LaboratorioPendiente = {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  horasEsperando: number;
};

/** Bandeja de hoy: laboratorios en `pendiente_revision` hace más de 48hs. */
export async function obtenerLaboratoriosPendientesLargos(
  supabase: Client
): Promise<LaboratorioPendiente[]> {
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("laboratorios")
    .select("id, paciente_id, created_at, pacientes(nombre)")
    .eq("estado", "pendiente_revision")
    .lte("created_at", limite.toISOString())
    .order("created_at", { ascending: true });

  const ahora = new Date().getTime();

  return (data ?? []).map((l) => ({
    id: l.id,
    pacienteId: l.paciente_id,
    pacienteNombre:
      (l.pacientes as unknown as { nombre: string } | null)?.nombre ??
      "Paciente",
    horasEsperando: Math.floor(
      (ahora - new Date(l.created_at).getTime()) / (1000 * 60 * 60)
    ),
  }));
}
