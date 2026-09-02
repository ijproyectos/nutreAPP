"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerConversaciones, type Conversacion } from "@/lib/queries/chats";

export type Destino = { tipo: "paciente" | "grupo"; id: string };

/** Wrapper "use server" de obtenerConversaciones — es lo que usa el
 * polling de TanStack Query en chats-view.tsx (queryFn no puede recibir
 * un cliente Supabase no serializable desde el componente). */
export async function obtenerConversacionesAction(): Promise<Conversacion[]> {
  const { supabase } = await getAuthorizedProfesional();
  return obtenerConversaciones(supabase);
}

export type MensajeChat = {
  id: string;
  remitente: "profesional" | "paciente";
  remitentePacienteId: string | null;
  remitenteNombre: string | null;
  contenido: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTipo: string | null;
  leido: boolean;
  createdAt: string;
};

const MAX_BYTES = 15 * 1024 * 1024; // 15MB, mismo límite que el bucket y next.config.ts

/** RF-050: historial de una conversación (1:1 o grupo). Las URLs de
 * adjuntos se firman acá (300s, mismo criterio que la ficha de paciente
 * con laboratorios) — el bucket es privado, no hay URL pública que
 * cachear. Usado tanto para la carga inicial como para el polling
 * (queryFn de TanStack Query en chats-view.tsx). */
export async function obtenerMensajesChat(
  destino: Destino
): Promise<MensajeChat[]> {
  const { supabase } = await getAuthorizedProfesional();

  let query = supabase
    .from("mensajes")
    .select(
      "id, remitente, remitente_paciente_id, contenido, archivo_url, archivo_nombre, archivo_tipo, leido, created_at, pacientes!remitente_paciente_id(nombre)"
    )
    .order("created_at", { ascending: true })
    .limit(500);

  query =
    destino.tipo === "paciente"
      ? query.eq("paciente_id", destino.id)
      : query.eq("grupo_id", destino.id);

  const { data, error } = await query;

  if (error) {
    console.error("[obtenerMensajesChat] select falló:", error);
    return [];
  }

  const mensajes = data ?? [];
  const conArchivo = mensajes.filter((m) => m.archivo_url);
  const urlsFirmadas = new Map<string, string>();
  for (const m of conArchivo) {
    const { data: firmada } = await supabase.storage
      .from("chat-adjuntos")
      .createSignedUrl(m.archivo_url as string, 300);
    if (firmada?.signedUrl) urlsFirmadas.set(m.id, firmada.signedUrl);
  }

  return mensajes.map((m) => ({
    id: m.id,
    remitente: m.remitente,
    remitentePacienteId: m.remitente_paciente_id,
    remitenteNombre:
      (m.pacientes as unknown as { nombre: string } | null)?.nombre ?? null,
    contenido: m.contenido,
    archivoUrl: m.archivo_url ? (urlsFirmadas.get(m.id) ?? null) : null,
    archivoNombre: m.archivo_nombre,
    archivoTipo: m.archivo_tipo,
    leido: m.leido,
    createdAt: m.created_at,
  }));
}

export type EnviarMensajeState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

/** RF-050: mandar un mensaje (texto y/o adjunto) a un paciente o grupo
 * propio. La policy RLS de insert (`mensajes_insert_profesional[_grupo]`)
 * es la barrera real — acá igual se relee que el destino sea propio antes
 * de subir el archivo, para no gastar una subida a Storage si el insert
 * de todos modos va a fallar por RLS. */
export async function enviarMensaje(
  _prevState: EnviarMensajeState,
  formData: FormData
): Promise<EnviarMensajeState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const destinoTipo = String(formData.get("destino_tipo") ?? "");
  const destinoId = String(formData.get("destino_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const archivo = formData.get("archivo");
  const tieneArchivo = archivo instanceof File && archivo.size > 0;

  if (destinoTipo !== "paciente" && destinoTipo !== "grupo") {
    return { status: "error", error: "Destino inválido." };
  }
  if (!contenido && !tieneArchivo) {
    return { status: "error", error: "Escribí algo o adjuntá un archivo." };
  }
  if (tieneArchivo && (archivo as File).size > MAX_BYTES) {
    return { status: "error", error: "El archivo pesa más de 15MB." };
  }

  if (destinoTipo === "paciente") {
    const { data: propio } = await supabase
      .from("pacientes")
      .select("id")
      .eq("id", destinoId)
      .eq("profesional_id", profesional.id)
      .maybeSingle();
    if (!propio) return { status: "error", error: "Paciente inválido." };
  } else {
    const { data: propio } = await supabase
      .from("chat_grupos")
      .select("id")
      .eq("id", destinoId)
      .eq("profesional_id", profesional.id)
      .maybeSingle();
    if (!propio) return { status: "error", error: "Grupo inválido." };
  }

  let archivoUrl: string | null = null;
  let archivoNombre: string | null = null;
  let archivoTipo: string | null = null;

  if (tieneArchivo) {
    const file = archivo as File;
    const path = `${destinoTipo}/${destinoId}/${crypto.randomUUID()}-${file.name}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("chat-adjuntos")
      .upload(path, bytes, { contentType: file.type || "application/octet-stream" });
    if (uploadError) {
      console.error("[enviarMensaje] upload falló:", uploadError);
      return { status: "error", error: "No se pudo subir el archivo. Intentá de nuevo." };
    }
    archivoUrl = path;
    archivoNombre = file.name;
    archivoTipo = file.type || null;
  }

  const { error } = await supabase.from("mensajes").insert({
    profesional_id: profesional.id,
    paciente_id: destinoTipo === "paciente" ? destinoId : null,
    grupo_id: destinoTipo === "grupo" ? destinoId : null,
    remitente: "profesional",
    contenido,
    archivo_url: archivoUrl,
    archivo_nombre: archivoNombre,
    archivo_tipo: archivoTipo,
  });

  if (error) {
    console.error("[enviarMensaje] insert falló:", error);
    return { status: "error", error: "No se pudo enviar el mensaje. Intentá de nuevo." };
  }

  revalidatePath("/app/chats");
  return { status: "success" };
}

/** Marca como leídos los mensajes del paciente que todavía no se habían
 * visto — se llama al abrir la conversación (ver chats-view.tsx). Solo
 * 1:1: los mensajes de grupo no tienen `leido` por destinatario, ver la
 * nota en 011_chat_grupos_adjuntos.sql. Nunca lanza — es un side effect
 * de UX, no crítico si falla una vez. */
export async function marcarConversacionLeida(pacienteId: string): Promise<void> {
  const { supabase } = await getAuthorizedProfesional();
  const { error } = await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("paciente_id", pacienteId)
    .eq("remitente", "paciente")
    .eq("leido", false);
  if (error) {
    console.error("[marcarConversacionLeida] update falló:", error);
  }
}

export type CrearGrupoState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; grupoId: string };

/** RF-050 mockup "Nuevo grupo": crea el grupo + los miembros en dos
 * pasos (no hay una RPC atómica para esto — a diferencia de
 * invitar_paciente, acá no hay un cálculo/validación cross-tabla que
 * proteger más allá de lo que ya hace RLS, mismo criterio que
 * docs/architecture.md sobre cuándo NO hace falta una RPC dedicada). Si
 * falla el insert de miembros después de crear el grupo, el grupo queda
 * vacío en vez de a medias con algunos miembros — el profesional puede
 * reintentar agregando miembros, no hace falta una transacción real para
 * este caso. */
export async function crearGrupo(
  _prevState: CrearGrupoState,
  formData: FormData
): Promise<CrearGrupoState> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const miembros = formData.getAll("miembros").map(String).filter(Boolean);

  if (!nombre) {
    return { status: "error", error: "Ponele un nombre al grupo." };
  }
  if (miembros.length < 2) {
    return { status: "error", error: "Elegí al menos 2 pacientes." };
  }

  const { data: grupo, error: grupoError } = await supabase
    .from("chat_grupos")
    .insert({ profesional_id: profesional.id, nombre })
    .select("id")
    .single();

  if (grupoError || !grupo) {
    console.error("[crearGrupo] insert de chat_grupos falló:", grupoError);
    return { status: "error", error: "No se pudo crear el grupo. Intentá de nuevo." };
  }

  const { error: miembrosError } = await supabase
    .from("chat_grupo_miembros")
    .insert(miembros.map((pacienteId) => ({ grupo_id: grupo.id, paciente_id: pacienteId })));

  if (miembrosError) {
    console.error("[crearGrupo] insert de miembros falló:", miembrosError);
    return {
      status: "error",
      error: "El grupo se creó pero no se pudieron agregar los miembros. Revisalo en el chat.",
    };
  }

  revalidatePath("/app/chats");
  return { status: "success", grupoId: grupo.id };
}
