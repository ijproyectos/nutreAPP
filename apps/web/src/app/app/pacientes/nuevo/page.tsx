import { headers } from "next/headers";
import { getAuthorizedProfesional } from "@/lib/dal";
import { AltaPacienteView } from "./alta-paciente-view";

export default async function NuevoPacientePage() {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const headersList = await headers();
  const host = headersList.get("host") ?? "nutriar.netlify.app";
  const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  // Configuración → Comunicación (013_configuracion_consultorio.sql).
  const { data: preferencias, error } = await supabase
    .from("profesionales")
    .select("plantilla_invitacion_whatsapp")
    .eq("id", profesional.id)
    .maybeSingle();
  if (error) {
    console.error("[NuevoPacientePage] select de preferencias falló:", error);
  }

  return (
    <AltaPacienteView
      profesionalNombre={profesional.nombre}
      profesionalConsultorio={profesional.consultorio}
      origin={origin}
      plantillaInvitacion={preferencias?.plantilla_invitacion_whatsapp ?? null}
    />
  );
}
