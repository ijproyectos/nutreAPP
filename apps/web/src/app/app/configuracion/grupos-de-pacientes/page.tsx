import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { Button } from "@/components/ui/button";

/** No es una feature nueva — los grupos ya existen (módulo Chat,
 * `chat_grupos`/`chat_grupo_miembros`). Esta pantalla es un resumen de
 * solo lectura con el conteo de miembros; la gestión real (crear grupo,
 * elegir miembros) sigue viviendo en /app/chats, que es donde tiene
 * sentido — un grupo es, ante todo, una conversación. */
export default async function GruposDePacientesPage() {
  const { supabase } = await getAuthorizedProfesional();

  const { data: grupos, error } = await supabase
    .from("chat_grupos")
    .select("id, nombre, chat_grupo_miembros(paciente_id)")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[GruposDePacientesPage] select falló:", error);
  }

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Grupos de pacientes</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href="/app/chats" />}
        >
          Ir a Chats <ArrowRight className="size-3.5" />
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Los grupos se crean y gestionan desde Chats — acá solo un resumen.
      </p>

      {(!grupos || grupos.length === 0) && (
        <p className="text-sm text-muted-foreground">Todavía no creaste ningún grupo.</p>
      )}

      {grupos && grupos.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {grupos.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">{g.nombre}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {(g.chat_grupo_miembros as unknown as { paciente_id: string }[]).length}{" "}
                miembro
                {(g.chat_grupo_miembros as unknown as { paciente_id: string }[]).length === 1
                  ? ""
                  : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
