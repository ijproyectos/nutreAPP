import { getAuthorizedProfesional } from "@/lib/dal";
import { PlanesAlimentariosView } from "./planes-alimentarios-view";

export default async function PlanesAlimentariosPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("plantilla_plan_alimentario")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[PlanesAlimentariosPage] select falló:", error);
  }

  return <PlanesAlimentariosView plantillaInicial={data?.plantilla_plan_alimentario ?? ""} />;
}
