import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>;

export type TurnoSinConfirmar = {
  id: string;
  fechaHora: string;
  pacienteNombre: string;
};

/** RF-040, regla 2: turnos de las próximas 48h todavía en estado pendiente. */
export async function obtenerTurnosSinConfirmar(
  supabase: Client
): Promise<TurnoSinConfirmar[]> {
  const ahora = new Date();
  const en48h = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("turnos")
    .select("id, fecha_hora, estado, pacientes(nombre)")
    .eq("estado", "pendiente")
    .gte("fecha_hora", ahora.toISOString())
    .lte("fecha_hora", en48h.toISOString())
    .order("fecha_hora", { ascending: true });

  return (data ?? []).map((t) => ({
    id: t.id,
    fechaHora: t.fecha_hora,
    pacienteNombre: (t.pacientes as unknown as { nombre: string } | null)
      ?.nombre ?? "Paciente",
  }));
}

export type ResumenCobros = {
  totalPendiente: number;
  cantidadPendiente: number;
  masAntiguo: { pacienteNombre: string; fecha: string } | null;
};

/** RF-041: $ por cobrar = suma de cobros con estado 'pendiente'. */
export async function obtenerResumenCobros(
  supabase: Client
): Promise<ResumenCobros> {
  const { data } = await supabase
    .from("cobros")
    .select("monto, fecha_vencimiento, created_at, pacientes(nombre)")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const filas = data ?? [];
  const totalPendiente = filas.reduce((sum, c) => sum + Number(c.monto), 0);
  const primero = filas[0];

  return {
    totalPendiente,
    cantidadPendiente: filas.length,
    masAntiguo: primero
      ? {
          pacienteNombre:
            (primero.pacientes as unknown as { nombre: string } | null)
              ?.nombre ?? "Paciente",
          fecha: primero.fecha_vencimiento ?? primero.created_at,
        }
      : null,
  };
}

/** RF-041: % continuidad = activos con próximo turno / total activos. */
export async function obtenerContinuidad(
  supabase: Client
): Promise<{ porcentaje: number; totalActivos: number }> {
  const { data: activos } = await supabase
    .from("pacientes")
    .select("id")
    .eq("estado", "activo");

  const ids = (activos ?? []).map((p) => p.id);
  if (ids.length === 0) return { porcentaje: 0, totalActivos: 0 };

  const { data: turnos } = await supabase
    .from("turnos")
    .select("paciente_id, fecha_hora")
    .in("paciente_id", ids)
    .gt("fecha_hora", new Date().toISOString())
    .neq("estado", "cancelado");

  const conTurno = new Set((turnos ?? []).map((t) => t.paciente_id));
  return {
    porcentaje: Math.round((conTurno.size / ids.length) * 100),
    totalActivos: ids.length,
  };
}

export type TurnoDeHoy = {
  id: string;
  fechaHora: string;
  pacienteNombre: string;
  tipo: string;
  estado: string;
  brief: { acordado: string | null; completo: string | null; cambio: string | null } | null;
};

/** Agenda de hoy — turnos del día calendario actual, con el brief de
 *  continuidad (tabla `consultas`) del que esté en curso, si existe. */
export async function obtenerAgendaDeHoy(
  supabase: Client
): Promise<TurnoDeHoy[]> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("turnos")
    .select("id, fecha_hora, tipo, estado, pacientes(nombre)")
    .gte("fecha_hora", inicio.toISOString())
    .lte("fecha_hora", fin.toISOString())
    .neq("estado", "cancelado")
    .order("fecha_hora", { ascending: true });

  const turnos = data ?? [];
  const enCursoId = turnos.find((t) => t.estado === "en_curso")?.id;

  const briefPorTurno = new Map<
    string,
    { acordado: string | null; completo: string | null; cambio: string | null }
  >();

  if (enCursoId) {
    const { data: consulta } = await supabase
      .from("consultas")
      .select("turno_id, acordado, completo, cambio")
      .eq("turno_id", enCursoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consulta) {
      briefPorTurno.set(consulta.turno_id, {
        acordado: consulta.acordado,
        completo: consulta.completo,
        cambio: consulta.cambio,
      });
    }
  }

  return turnos.map((t) => ({
    id: t.id,
    fechaHora: t.fecha_hora,
    tipo: t.tipo,
    estado: t.estado,
    pacienteNombre:
      (t.pacientes as unknown as { nombre: string } | null)?.nombre ??
      "Paciente",
    brief: briefPorTurno.get(t.id) ?? null,
  }));
}

export type ActividadReciente = {
  tipo: "medicion" | "plan" | "turno";
  descripcion: string;
  fecha: string;
};

/** Actividad reciente — combina lo que sí tiene timestamp confiable: alta
 *  de mediciones, envío de planes y creación de turnos. No incluye "turno
 *  confirmado" porque el schema no registra cuándo cambió el estado, solo
 *  cuándo se creó la fila (ver docs/data-model.md). */
export async function obtenerActividadReciente(
  supabase: Client
): Promise<ActividadReciente[]> {
  const [mediciones, planes, turnos] = await Promise.all([
    supabase
      .from("mediciones")
      .select("created_at, pacientes(nombre)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("planes")
      .select("enviado_at, pacientes(nombre)")
      .not("enviado_at", "is", null)
      .order("enviado_at", { ascending: false })
      .limit(5),
    supabase
      .from("turnos")
      .select("created_at, pacientes(nombre)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const nombre = (row: { pacientes: unknown }) =>
    (row.pacientes as { nombre: string } | null)?.nombre ?? "Paciente";

  const eventos: ActividadReciente[] = [
    ...(mediciones.data ?? []).map((m) => ({
      tipo: "medicion" as const,
      descripcion: `Medición registrada: ${nombre(m)}`,
      fecha: m.created_at,
    })),
    ...(planes.data ?? []).map((p) => ({
      tipo: "plan" as const,
      descripcion: `Plan enviado: ${nombre(p)}`,
      fecha: p.enviado_at as string,
    })),
    ...(turnos.data ?? []).map((t) => ({
      tipo: "turno" as const,
      descripcion: `Turno agendado: ${nombre(t)}`,
      fecha: t.created_at,
    })),
  ];

  return eventos
    .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
    .slice(0, 5);
}
