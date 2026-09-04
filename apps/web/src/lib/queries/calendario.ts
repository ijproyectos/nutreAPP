import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type DiaCalendario = {
  fecha: string; // YYYY-MM-DD
  conTurnos: boolean;
  sinConfirmar: boolean;
};

/** Rediseño visual de Inicio — mini calendario del mes con un punto por
 * día (con turnos / con alguno sin confirmar). No existía ningún widget
 * de calendario en Inicio antes de esto (gap ya señalado en
 * CLAUDE.md, sección Alta de paciente). `mes` en formato YYYY-MM. */
export async function obtenerCalendarioMes(
  supabase: Client,
  mes: string
): Promise<Map<string, DiaCalendario>> {
  const [anio, mesNum] = mes.split("-").map(Number);
  const desde = new Date(anio, mesNum - 1, 1);
  const hasta = new Date(anio, mesNum, 1); // primer día del mes siguiente, exclusivo

  const { data, error } = await supabase
    .from("turnos")
    .select("fecha_hora, estado")
    .gte("fecha_hora", desde.toISOString())
    .lt("fecha_hora", hasta.toISOString())
    .neq("estado", "cancelado");

  if (error) {
    console.error("[obtenerCalendarioMes] select falló:", error);
    return new Map();
  }

  const dias = new Map<string, DiaCalendario>();
  for (const t of data ?? []) {
    // Fecha local del profesional, no UTC — mismo criterio que
    // paraInputFecha() en lib/format.ts, para no correr de día cerca de
    // medianoche.
    const d = new Date(t.fecha_hora);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const actual = dias.get(fecha) ?? { fecha, conTurnos: false, sinConfirmar: false };
    actual.conTurnos = true;
    if (t.estado === "pendiente") actual.sinConfirmar = true;
    dias.set(fecha, actual);
  }
  return dias;
}
