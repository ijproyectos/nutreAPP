"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedPaciente } from "@/lib/dal";
import type { Destino, MensajeChat } from "@/app/app/chats/actions";

export type { Destino, MensajeChat };

export type ConversacionPaciente = {
  tipo: "paciente" | "grupo";
  id: string;
  nombre: string;
  ultimoMensaje: string | null;
  ultimaActividad: string | null;
};

const MAX_BYTES = 15 * 1024 * 1024;

/** RF-083: la conversación 1:1 con su propio profesional (siempre existe
 * — `destino.id` para el lado paciente es su propio `paciente.id`) más
 * los grupos de los que sea miembro. */
export async function obtenerConversacionesPaciente(): Promise<ConversacionPaciente[]> {
  const { supabase, paciente } = await getAuthorizedPaciente();

  const { data: profesional, error: profesionalError } = await supabase
    .from("profesionales")
    .select("nombre")
    .eq("id", paciente.profesional_id)
    .maybeSingle();
  if (profesionalError) {
    console.error(
      "[obtenerConversacionesPaciente] select de profesionales falló:",
      profesionalError
    );
  }

  const { data: grupoIds, error: grupoIdsError } = await supabase
    .from("chat_grupo_miembros")
    .select("grupo_id")
    .eq("paciente_id", paciente.id);
  if (grupoIdsError) {
    console.error(
      "[obtenerConversacionesPaciente] select de chat_grupo_miembros falló:",
      grupoIdsError
    );
  }

  const idsGrupos = (grupoIds ?? []).map((g) => g.grupo_id as string);
  let grupos: { id: string; nombre: string }[] = [];
  if (idsGrupos.length) {
    const { data, error: gruposError } = await supabase
      .from("chat_grupos")
      .select("id, nombre")
      .in("id", idsGrupos);
    if (gruposError) {
      console.error("[obtenerConversacionesPaciente] select de chat_grupos falló:", gruposError);
    }
    grupos = data ?? [];
  }

  const [{ data: msjPaciente }, { data: msjGrupo }] = await Promise.all([
    supabase
      .from("mensajes")
      .select("contenido, archivo_nombre, created_at")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false })
      .limit(1),
    idsGrupos.length
      ? supabase
          .from("mensajes")
          .select("grupo_id, contenido, archivo_nombre, created_at")
          .in("grupo_id", idsGrupos)
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const ultimoPorGrupo = new Map<string, { contenido: string; archivo_nombre: string | null; created_at: string }>();
  for (const m of msjGrupo ?? []) {
    if (!ultimoPorGrupo.has(m.grupo_id)) ultimoPorGrupo.set(m.grupo_id, m);
  }

  const ultimo1a1 = (msjPaciente ?? [])[0];

  const conversaciones: ConversacionPaciente[] = [
    {
      tipo: "paciente",
      id: paciente.id,
      nombre: profesional?.nombre ?? "Tu nutricionista",
      ultimoMensaje: ultimo1a1?.contenido || ultimo1a1?.archivo_nombre || null,
      ultimaActividad: ultimo1a1?.created_at ?? null,
    },
    ...(grupos ?? []).map((g) => {
      const ultimo = ultimoPorGrupo.get(g.id);
      return {
        tipo: "grupo" as const,
        id: g.id as string,
        nombre: g.nombre as string,
        ultimoMensaje: ultimo?.contenido || ultimo?.archivo_nombre || null,
        ultimaActividad: ultimo?.created_at ?? null,
      };
    }),
  ];

  return conversaciones.sort((a, b) => {
    if (a.ultimaActividad && b.ultimaActividad) {
      return +new Date(b.ultimaActividad) - +new Date(a.ultimaActividad);
    }
    if (a.ultimaActividad) return -1;
    if (b.ultimaActividad) return 1;
    return a.nombre.localeCompare(b.nombre);
  });
}

export async function obtenerMensajesChatPaciente(destino: Destino): Promise<MensajeChat[]> {
  const { supabase, paciente } = await getAuthorizedPaciente();

  let query = supabase
    .from("mensajes")
    .select(
      "id, remitente, remitente_paciente_id, contenido, archivo_url, archivo_nombre, archivo_tipo, leido, created_at, pacientes!remitente_paciente_id(nombre)"
    )
    .order("created_at", { ascending: true })
    .limit(500);

  query =
    destino.tipo === "paciente"
      ? query.eq("paciente_id", paciente.id)
      : query.eq("grupo_id", destino.id);

  const { data, error } = await query;
  if (error) {
    console.error("[obtenerMensajesChatPaciente] select falló:", error);
    return [];
  }

  const mensajes = data ?? [];
  const urlsFirmadas = new Map<string, string>();
  for (const m of mensajes.filter((m) => m.archivo_url)) {
    const { data: firmada } = await supabase.storage
      .from("chat-adjuntos")
      .createSignedUrl(m.archivo_url as string, 300);
    if (firmada?.signedUrl) urlsFirmadas.set(m.id, firmada.signedUrl);
  }

  return mensajes.map((m) => ({
    id: m.id,
    remitente: m.remitente,
    remitentePacienteId: m.remitente_paciente_id,
    remitenteNombre: (m.pacientes as unknown as { nombre: string } | null)?.nombre ?? null,
    contenido: m.contenido,
    archivoUrl: m.archivo_url ? (urlsFirmadas.get(m.id) ?? null) : null,
    archivoNombre: m.archivo_nombre,
    archivoTipo: m.archivo_tipo,
    leido: m.leido,
    createdAt: m.created_at,
  }));
}

export type EnviarMensajePacienteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function enviarMensajePaciente(
  _prevState: EnviarMensajePacienteState,
  formData: FormData
): Promise<EnviarMensajePacienteState> {
  const { supabase, paciente } = await getAuthorizedPaciente();

  const destinoTipo = String(formData.get("destino_tipo") ?? "");
  const destinoId = String(formData.get("destino_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const archivo = formData.get("archivo");
  const tieneArchivo = archivo instanceof File && archivo.size > 0;

  if (destinoTipo !== "paciente" && destinoTipo !== "grupo") {
    return { status: "error", error: "Destino inválido." };
  }
  if (destinoTipo === "paciente" && destinoId !== paciente.id) {
    return { status: "error", error: "Destino inválido." };
  }
  if (!contenido && !tieneArchivo) {
    return { status: "error", error: "Escribí algo o adjuntá un archivo." };
  }
  if (tieneArchivo && (archivo as File).size > MAX_BYTES) {
    return { status: "error", error: "El archivo pesa más de 15MB." };
  }

  if (destinoTipo === "grupo") {
    const { data: esMiembro } = await supabase
      .from("chat_grupo_miembros")
      .select("grupo_id")
      .eq("grupo_id", destinoId)
      .eq("paciente_id", paciente.id)
      .maybeSingle();
    if (!esMiembro) return { status: "error", error: "No sos miembro de ese grupo." };
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
      console.error("[enviarMensajePaciente] upload falló:", uploadError);
      return { status: "error", error: "No se pudo subir el archivo. Intentá de nuevo." };
    }
    archivoUrl = path;
    archivoNombre = file.name;
    archivoTipo = file.type || null;
  }

  const { error } = await supabase.from("mensajes").insert({
    profesional_id: paciente.profesional_id,
    paciente_id: destinoTipo === "paciente" ? paciente.id : null,
    grupo_id: destinoTipo === "grupo" ? destinoId : null,
    remitente: "paciente",
    remitente_paciente_id: destinoTipo === "grupo" ? paciente.id : null,
    contenido,
    archivo_url: archivoUrl,
    archivo_nombre: archivoNombre,
    archivo_tipo: archivoTipo,
  });

  if (error) {
    console.error("[enviarMensajePaciente] insert falló:", error);
    if (archivoUrl) {
      // Mismo criterio que enviarMensaje (app/chats/actions.ts): no dejar
      // el archivo huérfano en Storage si el insert falla después de
      // subirlo. Best-effort, no cambia la respuesta si falla el borrado.
      const { error: cleanupError } = await supabase.storage
        .from("chat-adjuntos")
        .remove([archivoUrl]);
      if (cleanupError) {
        console.error(
          "[enviarMensajePaciente] limpieza de archivo huérfano falló:",
          cleanupError
        );
      }
    }
    return { status: "error", error: "No se pudo enviar el mensaje. Intentá de nuevo." };
  }

  revalidatePath("/portal/chat");
  return { status: "success" };
}
