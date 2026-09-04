import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type Clase = "consulta" | "paquete" | "producto";
export type Modalidad = "presencial_video" | "videollamada" | "domicilio" | "digital";

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  presencial_video: "Presencial y videollamada",
  videollamada: "Videollamada",
  domicilio: "A domicilio",
  digital: "Digital",
};

export type ItemCatalogo = {
  id: string;
  nombre: string;
  clase: Clase;
  duracionOEntrega: string | null;
  modalidad: Modalidad;
  precio: number;
  publico: boolean;
  precioActualizadoAt: string;
  mesesDesdeActualizado: number;
  usoEsteMes: { cantidad: number; monto: number };
};

function mesesDesde(fecha: string, ahora: Date): number {
  const d = new Date(fecha);
  return Math.max(
    0,
    (ahora.getFullYear() - d.getFullYear()) * 12 + (ahora.getMonth() - d.getMonth())
  );
}

/** Catálogo de precios (RF sin número — mockup NutrIA Cobros.dc.html,
 * pestañas Servicios/Productos). `clases` filtra qué pestaña se está
 * pidiendo: `["consulta","paquete"]` para Servicios, `["producto"]`
 * para Productos. El "uso este mes" sale de `cobros.servicio_id` — solo
 * cuenta cobros creados este mes con ese servicio, sin importar si ya
 * se cobraron (mide "veces que se usó/vendió", no "veces que se
 * cobró" — coincide con el mockup, que llama "hechas"/"vendidos" a la
 * cantidad de consultas/ventas, no a los pagos efectivamente recibidos). */
export async function obtenerCatalogo(
  supabase: Client,
  clases: Clase[]
): Promise<ItemCatalogo[]> {
  const { data, error } = await supabase
    .from("servicios_precios")
    .select(
      "id, nombre, clase, duracion_o_entrega, modalidad, precio, publico, precio_actualizado_at"
    )
    .in("clase", clases)
    .eq("archivado", false)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[obtenerCatalogo] select falló:", error);
    return [];
  }

  const items = data ?? [];
  const ids = items.map((i) => i.id);

  const ahora = new Date();
  const desdeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

  const usoPorServicio = new Map<string, { cantidad: number; monto: number }>();
  if (ids.length > 0) {
    const { data: cobrosDelMes, error: cobrosError } = await supabase
      .from("cobros")
      .select("servicio_id, monto")
      .in("servicio_id", ids)
      .gte("created_at", desdeMes);
    if (cobrosError) {
      console.error("[obtenerCatalogo] select de cobros falló:", cobrosError);
    }
    for (const c of cobrosDelMes ?? []) {
      const actual = usoPorServicio.get(c.servicio_id) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += Number(c.monto);
      usoPorServicio.set(c.servicio_id, actual);
    }
  }

  return items.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    clase: i.clase as Clase,
    duracionOEntrega: i.duracion_o_entrega,
    modalidad: i.modalidad as Modalidad,
    precio: Number(i.precio),
    publico: i.publico,
    precioActualizadoAt: i.precio_actualizado_at,
    mesesDesdeActualizado: mesesDesde(i.precio_actualizado_at, ahora),
    usoEsteMes: usoPorServicio.get(i.id) ?? { cantidad: 0, monto: 0 },
  }));
}
