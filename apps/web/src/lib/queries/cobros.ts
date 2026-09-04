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
  /** "vencido" es puramente de presentación (pendiente + fecha_vencimiento
   * pasada) — no un valor guardado en `cobros.estado`, para no tocar el
   * enum existente ni las policies/queries que ya filtran por él. */
  estadoVisual: "pendiente" | "cobrado" | "vencido";
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

  const hoy = new Date();
  return (data ?? []).map((c) => ({
    id: c.id,
    pacienteId: c.paciente_id,
    pacienteNombre:
      (c.pacientes as unknown as { nombre: string } | null)?.nombre ?? "Paciente",
    monto: Number(c.monto),
    estado: c.estado,
    estadoVisual:
      c.estado === "pendiente" && c.fecha_vencimiento && new Date(c.fecha_vencimiento) < hoy
        ? "vencido"
        : c.estado,
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

export type MetricasCobros = {
  entroEsteMes: number;
  entroEsteMesCantidad: number;
  faltaCobrar: number;
  faltaCobrarCantidad: number;
  vencidos: number;
  /** null si el catálogo está vacío — no hay "precio más viejo" que mostrar. */
  precioMasViejoMeses: number | null;
};

/** Métricas compartidas por las 4 pestañas de Cobros (mockup NutrIA
 * Cobros.dc.html: se muestran igual sin importar la pestaña activa).
 * "Entró en [mes]" es el único de los tres cortado por mes calendario —
 * los otros dos (falta cobrar, precio más viejo) son estado actual, no
 * tienen ventana de tiempo. */
export async function obtenerMetricasCobros(supabase: Client): Promise<MetricasCobros> {
  const ahora = new Date();
  const desdeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

  const [{ data: cobradosDelMes, error: e1 }, { data: pendientes, error: e2 }, { data: catalogo, error: e3 }] =
    await Promise.all([
      supabase
        .from("cobros")
        .select("monto")
        .eq("estado", "cobrado")
        .gte("created_at", desdeMes),
      supabase.from("cobros").select("monto, fecha_vencimiento").eq("estado", "pendiente"),
      supabase
        .from("servicios_precios")
        .select("precio_actualizado_at")
        .eq("archivado", false),
    ]);

  if (e1) console.error("[obtenerMetricasCobros] select de cobrados falló:", e1);
  if (e2) console.error("[obtenerMetricasCobros] select de pendientes falló:", e2);
  if (e3) console.error("[obtenerMetricasCobros] select de catálogo falló:", e3);

  const entroEsteMesFilas = cobradosDelMes ?? [];
  const pendientesFilas = pendientes ?? [];
  const vencidos = pendientesFilas.filter(
    (p) => p.fecha_vencimiento && new Date(p.fecha_vencimiento) < ahora
  ).length;

  const meses = (catalogo ?? []).map(
    (c) =>
      (ahora.getFullYear() - new Date(c.precio_actualizado_at).getFullYear()) * 12 +
      (ahora.getMonth() - new Date(c.precio_actualizado_at).getMonth())
  );

  return {
    entroEsteMes: entroEsteMesFilas.reduce((sum, c) => sum + Number(c.monto), 0),
    entroEsteMesCantidad: entroEsteMesFilas.length,
    faltaCobrar: pendientesFilas.reduce((sum, c) => sum + Number(c.monto), 0),
    faltaCobrarCantidad: pendientesFilas.length,
    vencidos,
    precioMasViejoMeses: meses.length > 0 ? Math.max(0, ...meses) : null,
  };
}
