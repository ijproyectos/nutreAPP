import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerTurnosSinConfirmar } from "@/lib/queries/dashboard";
import { obtenerPacientesSinProximoTurno } from "@/lib/queries/pacientes";
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

  const [
    { data: turnos },
    { data: pacientes },
    { data: preferencias },
    sinProximoTurno,
    sinConfirmar,
  ] = await Promise.all([
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
    // Rediseño (NutrIA Agenda.dc.html): las dos tarjetas de señal arriba
    // del calendario — mismas queries que ya usa la Bandeja de hoy, para
    // que los números coincidan en toda la app en vez de recalcularse
    // distinto acá.
    obtenerPacientesSinProximoTurno(supabase),
    obtenerTurnosSinConfirmar(supabase),
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
    <div className="p-[38px] pb-16">
      <div className="mx-auto max-w-[1180px]">
        <AgendaView
          turnos={turnosNormalizados}
          pacientes={pacientesOpciones}
          pacienteFijo={pacienteFijo}
          tipoTurnoDefault={
            (preferencias?.tipo_turno_default as "presencial" | "videollamada" | null) ??
            "presencial"
          }
          pacientesSinTurno={sinProximoTurno}
          turnosSinConfirmar={sinConfirmar}
        />
      </div>
    </div>
  );
}
