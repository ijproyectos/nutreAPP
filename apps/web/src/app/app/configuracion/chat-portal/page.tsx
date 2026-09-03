import { getAuthorizedProfesional } from "@/lib/dal";
import { ChatPortalView } from "./chat-portal-view";

export default async function ChatPortalPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("mensaje_bienvenida_chat")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[ChatPortalPage] select falló:", error);
  }

  return <ChatPortalView mensajeInicial={data?.mensaje_bienvenida_chat ?? ""} />;
}
