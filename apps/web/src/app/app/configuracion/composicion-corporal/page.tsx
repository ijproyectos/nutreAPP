import { getAuthorizedProfesional } from "@/lib/dal";
import { ComposicionCorporalView } from "./composicion-corporal-view";

export default async function ComposicionCorporalPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("metricas_personalizadas")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[ComposicionCorporalPage] select falló:", error);
  }

  return <ComposicionCorporalView metricasIniciales={data?.metricas_personalizadas ?? []} />;
}
