import { getAuthorizedPaciente } from "@/lib/dal";
import { QueryProvider } from "@/app/app/chats/query-provider";
import { obtenerConversacionesPaciente } from "./actions";
import { ChatViewPaciente } from "./chat-view-paciente";

export default async function ChatPacientePage() {
  const { paciente } = await getAuthorizedPaciente();
  const conversaciones = await obtenerConversacionesPaciente();

  return (
    <QueryProvider>
      <ChatViewPaciente pacienteId={paciente.id} conversacionesIniciales={conversaciones} />
    </QueryProvider>
  );
}
