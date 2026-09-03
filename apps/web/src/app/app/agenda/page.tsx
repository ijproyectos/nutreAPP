import { getAuthorizedProfesional } from "@/lib/dal";
import { AgendaView } from "./agenda-view";

// RF-030/031/032. Ventana de turnos traída de una: últimos 30 días (para
// que el historial reciente aparezca al elegir esos días en el
// calendario) + próximos 120 (suficiente margen sin traer la tabla
// entera). El filtrado por día seleccionado se hace en el cliente
// (agenda-view.tsx) sobre este mismo array, sin ida y vuelta al server.
export default async function AgendaPage(props: PageProps<"/app/agenda">) {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;
  const pacienteIdFijo = (searchParams?.paciente as string | undefined) || null;

  const desde = new Date();
  desde.setDate(desde.getDate() - 30);
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + 120);

  const [{ data: turnos }, { data: pacientes }, { data: preferencias }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, fecha_hora, tipo, estado, notas, pacientes(id, nombre)")
      .gte("fecha_hora", desde.toISOString())
      .lte("fecha_hora", hasta.toISOString())
      .order("fecha_hora", { ascending: true }),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
    // Configuración → Mi agenda (013_configuracion_consultorio.sql).
    supabase
      .from("profesionales")
      .select("tipo_turno_default")
      .eq("id", profesional.id)
      .maybeSingle(),
  ]);

  const turnosNormalizados = (turnos ?? []).map((t) => {
    const paciente = t.pacientes as unknown as { id: string; nombre: string } | null;
    return {
      id: t.id,
      fechaHora: t.fecha_hora,
      tipo: t.tipo as "presencial" | "videollamada",
      estado: t.estado as "pendiente" | "confirmado" | "en_curso" | "cancelado",
      notas: t.notas,
      pacienteId: paciente?.id ?? "",
      pacienteNombre: paciente?.nombre ?? "Paciente",
    };
  });

  const pacientesOpciones = (pacientes ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
  }));

  const pacienteFijo = pacienteIdFijo
    ? pacientesOpciones.find((p) => p.id === pacienteIdFijo)
    : undefined;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Turnos de los últimos 30 días y los próximos 4 meses.
        </p>
      </div>
      <AgendaView
        turnos={turnosNormalizados}
        pacientes={pacientesOpciones}
        pacienteFijo={pacienteFijo}
        tipoTurnoDefault={
          (preferencias?.tipo_turno_default as "presencial" | "videollamada" | null) ??
          "presencial"
        }
      />
    </div>
  );
}
