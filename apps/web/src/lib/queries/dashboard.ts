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
  pacienteId: string;
  pacienteNombre: string;
  tipo: string;
  estado: string;
  brief: { acordado: string | null; completo: string | null; cambio: string | null } | null;
};

/** Agenda de hoy — turnos del día calendario actual, con el brief de
 *  continuidad (tabla `consultas`) más reciente de cada uno, si existe.
 *  Antes solo se traía el brief del turno "en curso" (la única fila que
 *  se mostraba destapada); con el rediseño visual cualquier turno se
 *  puede abrir para ver el suyo, así que hace falta el de todos. */
export async function obtenerAgendaDeHoy(
  supabase: Client
): Promise<TurnoDeHoy[]> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("turnos")
    .select("id, fecha_hora, tipo, estado, paciente_id, pacientes(nombre)")
    .gte("fecha_hora", inicio.toISOString())
    .lte("fecha_hora", fin.toISOString())
    .neq("estado", "cancelado")
    .order("fecha_hora", { ascending: true });

  const turnos = data ?? [];

  const briefPorTurno = new Map<
    string,
    { acordado: string | null; completo: string | null; cambio: string | null }
  >();

  if (turnos.length > 0) {
    const { data: consultas } = await supabase
      .from("consultas")
      .select("turno_id, acordado, completo, cambio")
      .in("turno_id", turnos.map((t) => t.id))
      .order("created_at", { ascending: false });

    // Orden desc + Map: la primera fila que se ve por turno_id es la más
    // reciente, las siguientes con el mismo turno_id se ignoran solas.
    for (const c of consultas ?? []) {
      if (briefPorTurno.has(c.turno_id)) continue;
      briefPorTurno.set(c.turno_id, {
        acordado: c.acordado,
        completo: c.completo,
        cambio: c.cambio,
      });
    }
  }

  return turnos.map((t) => ({
    id: t.id,
    fechaHora: t.fecha_hora,
    pacienteId: t.paciente_id,
    tipo: t.tipo,
    estado: t.estado,
    pacienteNombre:
      (t.pacientes as unknown as { nombre: string } | null)?.nombre ??
      "Paciente",
    brief: briefPorTurno.get(t.id) ?? null,
  }));
}

export type PacienteSinRegistro = {
  id: string;
  nombre: string;
  diasSinRegistro: number;
  ultimaActividad: string | null;
};

/** Alerta de prioridad informativa (RF-040 mockup "Alta de paciente"):
 *  pacientes activos, dados de alta hace más de 7 días, sin registrar
 *  comida en `registros_comida` en los últimos 7 días (o nunca). Antes
 *  excluida a propósito porque esa tabla no existía — ya se escribe desde
 *  `/portal/registro` (RF-081), así que el dato es real. */
export async function obtenerPacientesSinRegistrarComida(
  supabase: Client
): Promise<PacienteSinRegistro[]> {
  const haceSieteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: activos } = await supabase
    .from("pacientes")
    .select("id, nombre, created_at")
    .eq("estado", "activo")
    .lte("created_at", haceSieteDias.toISOString());

  const pacientes = activos ?? [];
  if (pacientes.length === 0) return [];

  const ids = pacientes.map((p) => p.id);
  const { data: registros } = await supabase
    .from("registros_comida")
    .select("paciente_id, fecha")
    .in("paciente_id", ids);

  const ultimaPorPaciente = new Map<string, string>();
  for (const r of registros ?? []) {
    const actual = ultimaPorPaciente.get(r.paciente_id);
    if (!actual || r.fecha > actual) ultimaPorPaciente.set(r.paciente_id, r.fecha);
  }

  const ahora = Date.now();
  const sinRegistro: PacienteSinRegistro[] = [];
  for (const p of pacientes) {
    const ultima = ultimaPorPaciente.get(p.id) ?? null;
    const desde = ultima ? new Date(ultima) : new Date(p.created_at);
    if (desde.getTime() > haceSieteDias.getTime()) continue;

    const dias = Math.floor((ahora - desde.getTime()) / (1000 * 60 * 60 * 24));
    sinRegistro.push({
      id: p.id,
      nombre: p.nombre,
      diasSinRegistro: dias,
      ultimaActividad: ultima,
    });
  }

  return sinRegistro.sort((a, b) => b.diasSinRegistro - a.diasSinRegistro);
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
