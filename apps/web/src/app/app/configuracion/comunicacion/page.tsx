import { getAuthorizedProfesional } from "@/lib/dal";
import { ComunicacionView } from "./comunicacion-view";

export default async function ComunicacionPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("plantilla_invitacion_whatsapp, plantilla_recordatorio_email")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[ComunicacionPage] select falló:", error);
  }

  return (
    <ComunicacionView
      valoresIniciales={{
        plantillaInvitacion: data?.plantilla_invitacion_whatsapp ?? "",
        plantillaRecordatorio: data?.plantilla_recordatorio_email ?? "",
      }}
    />
  );
}
