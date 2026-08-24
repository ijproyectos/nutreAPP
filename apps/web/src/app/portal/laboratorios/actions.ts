"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedPaciente } from "@/lib/dal";
import { parsearLaboratorio } from "@/lib/laboratorios/parsear";

export type SubirLaboratorioState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; valoresDetectados: number };

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];
const MAX_BYTES = 15 * 1024 * 1024;

/** RF de laboratorios: subida (Storage) + registro + intento de parseo
 *  automático. El parseo nunca bloquea la subida — si falla, el
 *  laboratorio queda igual, solo con `valores` vacío para carga manual. */
export async function subirLaboratorio(
  _prevState: SubirLaboratorioState,
  formData: FormData
): Promise<SubirLaboratorioState> {
  const { supabase, paciente } = await getAuthorizedPaciente();

  const archivo = formData.get("archivo");
  const fechaEstudio = String(formData.get("fecha_estudio") ?? "").trim();

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", error: "Elegí un archivo para subir." };
  }
  if (!fechaEstudio) {
    return { status: "error", error: "Indicá la fecha del estudio." };
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return {
      status: "error",
      error: "Formato no soportado — subí un PDF, JPG, PNG o HEIC.",
    };
  }
  if (archivo.size > MAX_BYTES) {
    return { status: "error", error: "El archivo pesa más de 15MB." };
  }

  const path = `${paciente.id}/${crypto.randomUUID()}-${archivo.name}`;
  const bytes = new Uint8Array(await archivo.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("laboratorios")
    .upload(path, bytes, { contentType: archivo.type });

  if (uploadError) {
    return {
      status: "error",
      error: "No se pudo subir el archivo. Intentá de nuevo.",
    };
  }

  const { data: laboratorio, error: insertError } = await supabase
    .from("laboratorios")
    .insert({
      paciente_id: paciente.id,
      profesional_id: paciente.profesional_id,
      archivo_url: path,
      fecha_estudio: fechaEstudio,
    })
    .select("id")
    .single();

  if (insertError || !laboratorio) {
    return {
      status: "error",
      error:
        "El archivo se subió pero no se pudo registrar. Avisale a tu nutricionista.",
    };
  }

  let valoresDetectados = 0;
  try {
    const valores = await parsearLaboratorio(bytes, archivo.type);
    valoresDetectados = Object.keys(valores).length;
    if (valoresDetectados > 0) {
      await supabase
        .from("laboratorios")
        .update({ valores })
        .eq("id", laboratorio.id);
    }
  } catch {
    // best-effort — el archivo y el registro ya quedaron guardados igual
  }

  revalidatePath("/portal/laboratorios");
  return { status: "success", valoresDetectados };
}
