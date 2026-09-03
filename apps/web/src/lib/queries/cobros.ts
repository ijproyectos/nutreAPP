import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type ResumenCobros = {
  totalPendiente: number;
  cantidadPendiente: number;
  masAntiguo: { pacienteNombre: string; fecha: string } | null;
};

/** RF-041/071: $ por cobrar = suma de cobros con estado 'pendiente'.
 * Reusada tanto por la Bandeja de hoy como por /app/cobros — mismo
 * patrón que `lib/queries/pacientes.ts` (una sola query, ambas pantallas
 * muestran siempre el mismo número). Vivía en lib/queries/dashboard.ts;
 * se movió acá porque /app/cobros es su lugar natural ahora que existe. */
export async function obtenerResumenCobros(supabase: Client): Promise<ResumenCobros> {
  const { data, error } = await supabase
    .from("cobros")
    .select("monto, fecha_vencimiento, created_at, pacientes(nombre)")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[obtenerResumenCobros] select falló:", error);
  }

  const filas = data ?? [];
  const totalPendiente = filas.reduce((sum, c) => sum + Number(c.monto), 0);
  const primero = filas[0];

  return {
    totalPendiente,
    cantidadPendiente: filas.length,
    masAntiguo: primero
      ? {
          pacienteNombre:
            (primero.pacientes as unknown as { nombre: string } | null)?.nombre ??
            "Paciente",
          fecha: primero.fecha_vencimiento ?? primero.created_at,
        }
      : null,
  };
}

export type Cobro = {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  monto: number;
  estado: "pendiente" | "cobrado";
  fechaVencimiento: string | null;
  consulta: { id: string; fecha: string } | null;
  createdAt: string;
};

/** RF-071: listado completo para /app/cobros, filtrable por estado.
 * `estado` undefined/"todos" trae ambos. */
export async function obtenerCobros(
  supabase: Client,
  estado?: "pendiente" | "cobrado"
): Promise<Cobro[]> {
  let query = supabase
    .from("cobros")
    .select(
      "id, paciente_id, monto, estado, fecha_vencimiento, created_at, pacientes(nombre), consultas(id, fecha)"
    )
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;

  if (error) {
    console.error("[obtenerCobros] select falló:", error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    pacienteId: c.paciente_id,
    pacienteNombre:
      (c.pacientes as unknown as { nombre: string } | null)?.nombre ?? "Paciente",
    monto: Number(c.monto),
    estado: c.estado,
    fechaVencimiento: c.fecha_vencimiento,
    consulta: c.consultas
      ? {
          id: (c.consultas as unknown as { id: string; fecha: string }).id,
          fecha: (c.consultas as unknown as { id: string; fecha: string }).fecha,
        }
      : null,
    createdAt: c.created_at,
  }));
}
