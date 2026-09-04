import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type DocumentoPaciente = {
  id: string;
  nombre: string;
  archivoTipo: string | null;
  archivoUrl: string | null; // firmada, null si falló la firma
  createdAt: string;
};

/** Tab "Archivos" de la ficha — documentos genéricos (informes, fotos),
 * distintos de `laboratorios` (que tiene su propio flujo de revisión,
 * ver 004_laboratorios.sql, y no se toca acá). URLs firmadas por 300s,
 * mismo criterio que laboratorios/chat-adjuntos. */
export async function obtenerDocumentos(
  supabase: Client,
  pacienteId: string
): Promise<DocumentoPaciente[]> {
  const { data, error } = await supabase
    .from("documentos_paciente")
    .select("id, nombre, archivo_url, archivo_tipo, created_at")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[obtenerDocumentos] select falló:", error);
    return [];
  }

  const filas = data ?? [];
  const urls = new Map<string, string>();
  for (const d of filas) {
    const { data: firmada } = await supabase.storage
      .from("documentos-paciente")
      .createSignedUrl(d.archivo_url, 300);
    if (firmada?.signedUrl) urls.set(d.id, firmada.signedUrl);
  }

  return filas.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    archivoTipo: d.archivo_tipo,
    archivoUrl: urls.get(d.id) ?? null,
    createdAt: d.created_at,
  }));
}
