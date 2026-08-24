import type { SupabaseClient } from "@supabase/supabase-js";

export type PacienteSinTurno = {
  id: string;
  nombre: string;
  diasSinTurno: number;
};

/**
 * RF-040, regla 1: pacientes activos sin turno futuro agendado (ni
 * cancelado). "Días sin turno" se cuenta desde el último turno pasado, o
 * desde el alta si nunca tuvo uno. Query real, no hardcodeada — reusada
 * tanto por la Bandeja de hoy como por el banner de /app/pacientes para
 * que ambos muestren siempre el mismo número.
 */
export async function obtenerPacientesSinProximoTurno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<PacienteSinTurno[]> {
  const { data: activos } = await supabase
    .from("pacientes")
    .select("id, nombre, created_at")
    .eq("estado", "activo");

  const pacientes = activos ?? [];
  if (pacientes.length === 0) return [];

  const ids = pacientes.map((p) => p.id);
  const { data: turnos } = await supabase
    .from("turnos")
    .select("paciente_id, fecha_hora")
    .in("paciente_id", ids)
    .neq("estado", "cancelado");

  const now = new Date().getTime();
  const porPaciente = new Map<string, { fecha_hora: string }[]>();
  for (const t of turnos ?? []) {
    const list = porPaciente.get(t.paciente_id) ?? [];
    list.push(t);
    porPaciente.set(t.paciente_id, list);
  }

  const sinTurno: PacienteSinTurno[] = [];
  for (const p of pacientes) {
    const propios = porPaciente.get(p.id) ?? [];
    const tieneFuturo = propios.some(
      (t) => new Date(t.fecha_hora).getTime() > now
    );
    if (tieneFuturo) continue;

    const ultimaPasada = propios
      .filter((t) => new Date(t.fecha_hora).getTime() <= now)
      .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))[0];

    const desde = ultimaPasada
      ? new Date(ultimaPasada.fecha_hora)
      : new Date(p.created_at);
    const dias = Math.floor(
      (now - desde.getTime()) / (1000 * 60 * 60 * 24)
    );

    sinTurno.push({ id: p.id, nombre: p.nombre, diasSinTurno: dias });
  }

  return sinTurno.sort((a, b) => b.diasSinTurno - a.diasSinTurno);
}
