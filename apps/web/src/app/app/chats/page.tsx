import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerConversaciones } from "@/lib/queries/chats";
import { QueryProvider } from "./query-provider";
import { ChatsView } from "./chats-view";

export default async function ChatsPage(props: PageProps<"/app/chats">) {
  const { supabase } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;
  const pacienteIdInicial = (searchParams?.paciente as string | undefined) || null;

  const [conversaciones, { data: pacientes }] = await Promise.all([
    obtenerConversaciones(supabase),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  return (
    <QueryProvider>
      <ChatsView
        conversacionesIniciales={conversaciones}
        pacientesDisponibles={pacientes ?? []}
        // Deep-link desde la ficha del paciente (botón "Chat") —
        // /app/chats?paciente=<id> abre directo esa conversación 1:1.
        destinoInicial={pacienteIdInicial ? { tipo: "paciente", id: pacienteIdInicial } : null}
      />
    </QueryProvider>
  );
}
