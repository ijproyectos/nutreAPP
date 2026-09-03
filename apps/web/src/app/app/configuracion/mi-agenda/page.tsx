import { getAuthorizedProfesional } from "@/lib/dal";
import { MiAgendaView } from "./mi-agenda-view";

export default async function MiAgendaPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("tipo_turno_default")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[MiAgendaPage] select falló:", error);
  }

  return (
    <MiAgendaView
      tipoDefaultInicial={
        (data?.tipo_turno_default as "presencial" | "videollamada" | null) ?? "presencial"
      }
    />
  );
}
