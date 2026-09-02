import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type Conversacion = {
  tipo: "paciente" | "grupo";
  id: string;
  nombre: string;
  ultimoMensaje: string | null;
  ultimoEsArchivo: boolean;
  ultimaActividad: string | null;
  noLeidos: number;
};

/** RF-050: lista de conversaciones del lado profesional — 1:1 (una por
 * paciente activo) + grupos, ordenadas por última actividad. Trae los
 * últimos mensajes de cada tabla en 2 queries (no N+1 por conversación) y
 * reduce en JS, mismo patrón que `obtenerAgendaDeHoy`/Agenda: traer todo
 * lo relevante de una vez y filtrar/agrupar del lado del cliente en vez
 * de ida y vuelta al server por fila. `limit(300)` es un tope pragmático
 * — con más volumen de mensajes esto necesitaría paginación real, no es
 * el caso todavía. */
export async function obtenerConversaciones(
  supabase: Client
): Promise<Conversacion[]> {
  const [
    { data: pacientes, error: pacientesError },
    { data: grupos, error: gruposError },
  ] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo"),
    supabase.from("chat_grupos").select("id, nombre"),
  ]);
  if (pacientesError) {
    console.error("[obtenerConversaciones] select de pacientes falló:", pacientesError);
  }
  if (gruposError) {
    console.error("[obtenerConversaciones] select de chat_grupos falló:", gruposError);
  }

  const pacienteIds = (pacientes ?? []).map((p) => p.id as string);
  const grupoIds = (grupos ?? []).map((g) => g.id as string);

  const [{ data: msjPaciente }, { data: msjGrupo }] = await Promise.all([
    pacienteIds.length
      ? supabase
          .from("mensajes")
          .select("paciente_id, contenido, archivo_nombre, remitente, leido, created_at")
          .in("paciente_id", pacienteIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] as never[] }),
    grupoIds.length
      ? supabase
          .from("mensajes")
          .select("grupo_id, contenido, archivo_nombre, created_at")
          .in("grupo_id", grupoIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const ultimoPorPaciente = new Map<
    string,
    { contenido: string; archivo_nombre: string | null; created_at: string }
  >();
  const noLeidosPorPaciente = new Map<string, number>();
  for (const m of msjPaciente ?? []) {
    if (!ultimoPorPaciente.has(m.paciente_id)) {
      ultimoPorPaciente.set(m.paciente_id, m);
    }
    if (m.remitente === "paciente" && !m.leido) {
      noLeidosPorPaciente.set(
        m.paciente_id,
        (noLeidosPorPaciente.get(m.paciente_id) ?? 0) + 1
      );
    }
  }

  const ultimoPorGrupo = new Map<
    string,
    { contenido: string; archivo_nombre: string | null; created_at: string }
  >();
  for (const m of msjGrupo ?? []) {
    if (!ultimoPorGrupo.has(m.grupo_id)) {
      ultimoPorGrupo.set(m.grupo_id, m);
    }
  }

  const conversaciones: Conversacion[] = [
    ...(pacientes ?? []).map((p) => {
      const ultimo = ultimoPorPaciente.get(p.id);
      return {
        tipo: "paciente" as const,
        id: p.id as string,
        nombre: p.nombre as string,
        ultimoMensaje: ultimo?.contenido || ultimo?.archivo_nombre || null,
        ultimoEsArchivo: !!ultimo?.archivo_nombre && !ultimo?.contenido,
        ultimaActividad: ultimo?.created_at ?? null,
        noLeidos: noLeidosPorPaciente.get(p.id) ?? 0,
      };
    }),
    ...(grupos ?? []).map((g) => {
      const ultimo = ultimoPorGrupo.get(g.id);
      return {
        tipo: "grupo" as const,
        id: g.id as string,
        nombre: g.nombre as string,
        ultimoMensaje: ultimo?.contenido || ultimo?.archivo_nombre || null,
        ultimoEsArchivo: !!ultimo?.archivo_nombre && !ultimo?.contenido,
        ultimaActividad: ultimo?.created_at ?? null,
        noLeidos: 0, // sin lectura por miembro en v1, ver 011_chat_grupos_adjuntos.sql
      };
    }),
  ];

  // Conversaciones con actividad primero (más reciente arriba), después
  // las que todavía no tienen ningún mensaje, alfabético.
  return conversaciones.sort((a, b) => {
    if (a.ultimaActividad && b.ultimaActividad) {
      return +new Date(b.ultimaActividad) - +new Date(a.ultimaActividad);
    }
    if (a.ultimaActividad) return -1;
    if (b.ultimaActividad) return 1;
    return a.nombre.localeCompare(b.nombre);
  });
}
