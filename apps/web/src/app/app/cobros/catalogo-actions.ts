"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerCatalogo, type Clase, type Modalidad } from "@/lib/queries/catalogo";

const CLASES: Clase[] = ["consulta", "paquete", "producto"];
const MODALIDADES: Modalidad[] = [
  "presencial_video",
  "videollamada",
  "domicilio",
  "digital",
];

function pathDeClase(clase: Clase): string {
  return clase === "producto" ? "/app/cobros/productos" : "/app/cobros/servicios";
}

export type GuardarServicioState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Alta/edición de un ítem del catálogo (RF sin número — mockup NutrIA
 * Cobros.dc.html). Si `id` viene en el form es edición: se relee el
 * precio actual antes de pisarlo, para saber si hay que resetear
 * `precio_actualizado_at` (solo cuando el precio realmente cambia — no
 * en cada edición de nombre/modalidad). */
export async function crearOEditarServicio(
  _prevState: GuardarServicioState,
  formData: FormData
): Promise<GuardarServicioState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const id = String(formData.get("id") ?? "").trim() || null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const clase = String(formData.get("clase") ?? "") as Clase;
  const modalidad = String(formData.get("modalidad") ?? "") as Modalidad;
  const duracionOEntrega = String(formData.get("duracion_o_entrega") ?? "").trim() || null;
  const precioRaw = String(formData.get("precio") ?? "").trim();
  const publico = formData.get("publico") === "true";

  if (!nombre) {
    return { status: "error", error: "Ponele un nombre." };
  }
  if (!CLASES.includes(clase)) {
    return { status: "error", error: "Elegí qué es." };
  }
  if (!MODALIDADES.includes(modalidad)) {
    return { status: "error", error: "Elegí una modalidad." };
  }
  const precio = Number(precioRaw);
  if (!precioRaw || Number.isNaN(precio) || precio <= 0) {
    return { status: "error", error: "El precio tiene que ser un número mayor a 0." };
  }

  if (id) {
    const { data: actual, error: actualError } = await supabase
      .from("servicios_precios")
      .select("precio")
      .eq("id", id)
      .eq("profesional_id", profesional.id)
      .maybeSingle();
    if (actualError) {
      console.error("[crearOEditarServicio] select falló:", actualError);
      return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
    }
    if (!actual) {
      return { status: "error", error: "Ese ítem no existe." };
    }
    const cambioPrecio = Number(actual.precio) !== precio;

    const { error } = await supabase
      .from("servicios_precios")
      .update({
        nombre,
        clase,
        modalidad,
        duracion_o_entrega: duracionOEntrega,
        precio,
        publico,
        ...(cambioPrecio ? { precio_actualizado_at: new Date().toISOString() } : {}),
      })
      .eq("id", id)
      .eq("profesional_id", profesional.id);

    if (error) {
      console.error("[crearOEditarServicio] update falló:", error);
      return { status: "error", error: "No se pudo guardar. Intentá de nuevo." };
    }
  } else {
    const { error } = await supabase.from("servicios_precios").insert({
      profesional_id: profesional.id,
      nombre,
      clase,
      modalidad,
      duracion_o_entrega: duracionOEntrega,
      precio,
      publico,
    });

    if (error) {
      console.error("[crearOEditarServicio] insert falló:", error);
      return { status: "error", error: "No se pudo crear. Intentá de nuevo." };
    }
  }

  revalidatePath(pathDeClase(clase));
  return { status: "success" };
}

export type ArchivarServicioState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** Soft delete ("Archivar" en el mockup) — nunca un delete real, ver
 * el comentario de `cobros.servicio_id` en la migración 017: un cobro ya
 * generado con este servicio tiene que seguir resolviendo su nombre/
 * precio histórico.
 *
 * Devuelve un discriminated union (no `void`) — hallazgo real del
 * `pre-commit-orchestrator`: con `void`, el caller (`handleArchivar` en
 * editor-servicio-dialog.tsx) cerraba el diálogo incondicionalmente
 * después del `await`, sin poder saber si el update había fallado. El
 * ítem seguía activo en el catálogo y el usuario veía el diálogo
 * cerrarse como si el archivado hubiera funcionado, sin ningún aviso. */
export async function archivarServicio(
  id: string,
  clase: Clase
): Promise<ArchivarServicioState> {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("servicios_precios")
    .update({ archivado: true })
    .eq("id", id)
    .eq("profesional_id", profesional.id);
  if (error) {
    console.error("[archivarServicio] update falló:", error);
    return { status: "error", error: "No se pudo archivar. Intentá de nuevo." };
  }
  revalidatePath(pathDeClase(clase));
  return { status: "success" };
}

export type AplicarAumentoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; cantidad: number };

/** "Actualizar precios" masivo — delega el cálculo a la RPC
 * `aplicar_aumento_precios` (017_catalogo_precios.sql): el precio nuevo
 * de cada fila depende de su propio precio actual, así que no se puede
 * expresar como un `.update()` con un valor literal desde acá — tiene
 * que resolverse en una sola sentencia SQL en el servidor. */
export async function aplicarAumentoPrecios(
  _prevState: AplicarAumentoState,
  formData: FormData
): Promise<AplicarAumentoState> {
  const { supabase } = await getAuthorizedProfesional();

  const pct = Number(String(formData.get("pct") ?? ""));
  const alcance = String(formData.get("alcance") ?? "");

  if (!pct || Number.isNaN(pct) || pct <= 0) {
    return { status: "error", error: "Elegí un porcentaje válido." };
  }
  if (!["todo", "consultas", "desactualizados"].includes(alcance)) {
    return { status: "error", error: "Alcance inválido." };
  }

  const { data, error } = await supabase.rpc("aplicar_aumento_precios", {
    p_pct: pct,
    p_alcance: alcance,
  });

  if (error) {
    console.error("[aplicarAumentoPrecios] rpc falló:", error);
    return { status: "error", error: "No se pudo aplicar el aumento. Intentá de nuevo." };
  }

  revalidatePath("/app/cobros/servicios");
  revalidatePath("/app/cobros/productos");
  return { status: "success", cantidad: (data as number) ?? 0 };
}

/** Catálogo completo (las 3 clases) para la previsualización del
 * diálogo de "Actualizar precios" — se pide como Server Action directa
 * (no como prop del server component padre) porque el diálogo se abre
 * tanto desde /app/cobros/servicios como desde /app/cobros/productos y
 * necesita ver el catálogo entero para la vista previa, no solo la
 * pestaña donde se lo abrió. */
export async function obtenerCatalogoCompleto(): Promise<
  { id: string; nombre: string; clase: Clase; precio: number; mesesDesdeActualizado: number }[]
> {
  const { supabase } = await getAuthorizedProfesional();
  const items = await obtenerCatalogo(supabase, CLASES);
  return items.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    clase: i.clase,
    precio: i.precio,
    mesesDesdeActualizado: i.mesesDesdeActualizado,
  }));
}

/** Lista de pacientes activos para el paso "avisar por WhatsApp" del
 * aumento — no hay envío en bloque real en esta app (todo WhatsApp acá
 * es un link `wa.me` que abre el propio profesional, nunca un envío
 * automático), así que esto alimenta una lista de links manuales, uno
 * por paciente, en vez de fabricar una automatización que no existe. */
export async function obtenerPacientesActivosParaAviso(): Promise<
  { id: string; nombre: string; telefono: string | null }[]
> {
  const { supabase } = await getAuthorizedProfesional();
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nombre, telefono")
    .eq("estado", "activo")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("[obtenerPacientesActivosParaAviso] select falló:", error);
    return [];
  }
  return data ?? [];
}
