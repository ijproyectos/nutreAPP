"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";

export type ActualizarCuentaState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Mockup "Configuración" → "Cuenta". `profesionales_update_self` (002)
 * ya permite que el profesional actualice cualquier columna de su propia
 * fila — no hace falta una RPC como en el alta de paciente (ahí el
 * paciente no tiene policy de update a propósito; acá el profesional
 * sí). */
export async function actualizarCuenta(
  _prevState: ActualizarCuentaState,
  formData: FormData
): Promise<ActualizarCuentaState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const matriculaNacional = String(formData.get("matricula_nacional") ?? "").trim();
  const matriculaProvincial = String(formData.get("matricula_provincial") ?? "").trim();
  const profesion = String(formData.get("profesion") ?? "").trim();
  const especialidades = formData
    .getAll("especialidades")
    .map(String)
    .map((e) => e.trim())
    .filter(Boolean);

  if (!nombre) {
    return { status: "error", error: "El nombre es obligatorio." };
  }

  const { error } = await supabase
    .from("profesionales")
    .update({
      nombre,
      apellido: apellido || null,
      telefono: telefono || null,
      matricula_nacional: matriculaNacional || null,
      matricula_provincial: matriculaProvincial || null,
      profesion: profesion || null,
      especialidades,
    })
    .eq("id", profesional.id);

  if (error) {
    console.error("[actualizarCuenta] update falló:", error);
    return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/cuenta");
  revalidatePath("/app"); // el saludo y el avatar del sidebar leen profesional.nombre
  return { status: "success" };
}

export type SubirArchivoPerfilState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; url: string };

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

/** Compartida por "Subir" (avatar) y "Subir firma" — mismo bucket
 * (`profesional-archivos`), mismo criterio de validación, solo cambia el
 * prefijo del path y la columna que actualiza. El archivo viejo (si
 * había uno) queda huérfano en Storage — trade-off aceptado, ver
 * 012_configuracion_cuenta.sql. */
async function subirArchivoPerfil(
  formData: FormData,
  tipo: "avatar" | "firma"
): Promise<SubirArchivoPerfilState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", error: "Elegí una imagen para subir." };
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return { status: "error", error: "Formato no soportado — subí un JPG, PNG o WEBP." };
  }
  if (archivo.size > MAX_BYTES) {
    return { status: "error", error: "La imagen pesa más de 5MB." };
  }

  const path = `${profesional.id}/${tipo}-${crypto.randomUUID()}-${archivo.name}`;
  const bytes = new Uint8Array(await archivo.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("profesional-archivos")
    .upload(path, bytes, { contentType: archivo.type });

  if (uploadError) {
    console.error(`[subirArchivoPerfil:${tipo}] upload falló:`, uploadError);
    return { status: "error", error: "No se pudo subir la imagen. Intentá de nuevo." };
  }

  const columna = tipo === "avatar" ? "avatar_url" : "firma_url";
  const { error: updateError } = await supabase
    .from("profesionales")
    .update({ [columna]: path })
    .eq("id", profesional.id);

  if (updateError) {
    console.error(`[subirArchivoPerfil:${tipo}] update falló:`, updateError);
    return { status: "error", error: "La imagen se subió pero no se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/app/configuracion/cuenta");
  revalidatePath("/app");
  return { status: "success", url: path };
}

export async function subirAvatar(
  _prevState: SubirArchivoPerfilState,
  formData: FormData
): Promise<SubirArchivoPerfilState> {
  return subirArchivoPerfil(formData, "avatar");
}

export async function subirFirma(
  _prevState: SubirArchivoPerfilState,
  formData: FormData
): Promise<SubirArchivoPerfilState> {
  return subirArchivoPerfil(formData, "firma");
}
