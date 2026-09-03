import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type Sede = { id: string; nombre: string; direccion: string | null };
export type ObraSocial = { id: string; nombre: string };

/** Configuración → Sedes/Obras sociales: catálogos propios del
 * profesional (`013_configuracion_consultorio.sql`). Standalone en este
 * pase — no están linkeados todavía a `pacientes.sede`/`obra_social`
 * (siguen siendo texto libre ahí), ver CLAUDE.md. */
export async function obtenerSedes(supabase: Client): Promise<Sede[]> {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre, direccion")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[obtenerSedes] select falló:", error);
    return [];
  }
  return data ?? [];
}

export async function obtenerObrasSociales(supabase: Client): Promise<ObraSocial[]> {
  const { data, error } = await supabase
    .from("obras_sociales")
    .select("id, nombre")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[obtenerObrasSociales] select falló:", error);
    return [];
  }
  return data ?? [];
}
