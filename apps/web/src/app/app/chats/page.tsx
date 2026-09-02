import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerConversaciones } from "@/lib/queries/chats";
import { QueryProvider } from "./query-provider";
import { ChatsView } from "./chats-view";

export default async function ChatsPage() {
  const { supabase } = await getAuthorizedProfesional();

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
      />
    </QueryProvider>
  );
}
