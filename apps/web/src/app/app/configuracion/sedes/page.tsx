import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerSedes } from "@/lib/queries/catalogos";
import { SedesView } from "./sedes-view";

export default async function SedesPage() {
  const { supabase } = await getAuthorizedProfesional();
  const sedes = await obtenerSedes(supabase);
  return <SedesView sedesIniciales={sedes} />;
}
