import { getAuthorizedPaciente } from "@/lib/dal";
import { QueryProvider } from "@/app/app/chats/query-provider";
import { obtenerConversacionesPaciente } from "./actions";
import { ChatViewPaciente } from "./chat-view-paciente";

export default async function ChatPacientePage() {
  const { supabase, paciente } = await getAuthorizedPaciente();
  const conversaciones = await obtenerConversacionesPaciente();

  // Configuración → Chat del portal (013_configuracion_consultorio.sql).
  const { data: preferencias, error } = await supabase
    .from("profesionales")
    .select("mensaje_bienvenida_chat")
    .eq("id", paciente.profesional_id)
    .maybeSingle();
  if (error) {
    console.error("[ChatPacientePage] select de preferencias falló:", error);
  }

  return (
    <QueryProvider>
      <ChatViewPaciente
        pacienteId={paciente.id}
        conversacionesIniciales={conversaciones}
        mensajeBienvenida={preferencias?.mensaje_bienvenida_chat ?? null}
      />
    </QueryProvider>
  );
}
