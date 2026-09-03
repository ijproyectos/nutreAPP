import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerObrasSociales } from "@/lib/queries/catalogos";
import { ObrasSocialesView } from "./obras-sociales-view";

export default async function ObrasSocialesPage() {
  const { supabase } = await getAuthorizedProfesional();
  const obrasSociales = await obtenerObrasSociales(supabase);
  return <ObrasSocialesView obrasSocialesIniciales={obrasSociales} />;
}
