"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB, mismo límite que el bucket

export type SubirDocumentoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Tab "Archivos" — subida de un documento genérico (informe, foto). Solo
 * el profesional sube en esta v1 (ver la nota en 018_ficha_documentos.sql). */
export async function subirDocumento(
  _prevState: SubirDocumentoState,
  formData: FormData
): Promise<SubirDocumentoState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const pacienteId = String(formData.get("paciente_id") ?? "");
  const archivo = formData.get("archivo");

  if (!pacienteId) {
    return { status: "error", error: "Paciente inválido." };
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", error: "Elegí un archivo." };
  }
  if (archivo.size > MAX_BYTES) {
    return { status: "error", error: "El archivo pesa más de 15MB." };
  }

  // Releer que el paciente sea propio antes de subir — mismo criterio
  // que enviarMensaje (Chat): no gastar la subida si el insert de todos
  // modos va a fallar por RLS.
  const { data: pacientePropio } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("profesional_id", profesional.id)
    .maybeSingle();
  if (!pacientePropio) {
    return { status: "error", error: "Paciente inválido." };
  }

  const path = `${pacienteId}/${crypto.randomUUID()}-${archivo.name}`;
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("documentos-paciente")
    .upload(path, bytes, { contentType: archivo.type || "application/octet-stream" });

  if (uploadError) {
    console.error("[subirDocumento] upload falló:", uploadError);
    return { status: "error", error: "No se pudo subir el archivo. Intentá de nuevo." };
  }

  const { error } = await supabase.from("documentos_paciente").insert({
    profesional_id: profesional.id,
    paciente_id: pacienteId,
    nombre: archivo.name,
    archivo_url: path,
    archivo_tipo: archivo.type || null,
  });

  if (error) {
    console.error("[subirDocumento] insert falló:", error);
    // Mismo patrón que enviarMensaje: no dejar el archivo huérfano en
    // Storage si el insert falla después de subirlo.
    const { error: cleanupError } = await supabase.storage
      .from("documentos-paciente")
      .remove([path]);
    if (cleanupError) {
      console.error("[subirDocumento] limpieza de archivo huérfano falló:", cleanupError);
    }
    return { status: "error", error: "No se pudo guardar el documento. Intentá de nuevo." };
  }

  revalidatePath(`/app/pacientes/${pacienteId}`);
  return { status: "success" };
}
