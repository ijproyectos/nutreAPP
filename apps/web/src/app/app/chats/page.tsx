import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerConversaciones } from "@/lib/queries/chats";
import { obtenerPacientesSinProximoTurno } from "@/lib/queries/pacientes";
import { QueryProvider } from "./query-provider";
import { ChatsView } from "./chats-view";

export default async function ChatsPage(props: PageProps<"/app/chats">) {
  const { supabase } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;
  const pacienteIdInicial = (searchParams?.paciente as string | undefined) || null;

  const [conversaciones, sinProximoTurno, { data: pacientes }] = await Promise.all([
    obtenerConversaciones(supabase),
    // Rediseño (NutrIA Chats.dc.html): la lista se ordena "por atención,
    // no por fecha" — pacientes sin próximo turno primero, sin importar
    // cuándo fue el último mensaje. Misma query que ya usa /app/pacientes
    // y la Bandeja de hoy, para que el criterio sea consistente en toda
    // la app.
    obtenerPacientesSinProximoTurno(supabase),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  // Fecha del próximo turno por paciente, para el chip verde "Turno D
  // mmm" del mockup en las conversaciones que sí tienen uno agendado.
  const pacienteIds = conversaciones
    .filter((c) => c.tipo === "paciente")
    .map((c) => c.id);
  const { data: turnos } = pacienteIds.length
    ? await supabase
        .from("turnos")
        .select("paciente_id, fecha_hora")
        .in("paciente_id", pacienteIds)
        .neq("estado", "cancelado")
    : { data: [] as { paciente_id: string; fecha_hora: string }[] };

  const ahora = new Date();
  const proximoTurnoPorPaciente: Record<string, string> = {};
  for (const t of turnos ?? []) {
    if (new Date(t.fecha_hora) <= ahora) continue;
    const actual = proximoTurnoPorPaciente[t.paciente_id];
    if (!actual || new Date(t.fecha_hora) < new Date(actual)) {
      proximoTurnoPorPaciente[t.paciente_id] = t.fecha_hora;
    }
  }

  return (
    <QueryProvider>
      <ChatsView
        conversacionesIniciales={conversaciones}
        pacientesDisponibles={pacientes ?? []}
        sinProximoTurnoIds={sinProximoTurno.map((p) => p.id)}
        proximoTurnoPorPaciente={proximoTurnoPorPaciente}
        // Deep-link desde la ficha del paciente (botón "Chat") —
        // /app/chats?paciente=<id> abre directo esa conversación 1:1.
        destinoInicial={pacienteIdInicial ? { tipo: "paciente", id: pacienteIdInicial } : null}
      />
    </QueryProvider>
  );
}
