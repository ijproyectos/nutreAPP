import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerCatalogo } from "@/lib/queries/catalogo";
import { obtenerMetricasCobros } from "@/lib/queries/cobros";
import { obtenerPacientesActivosParaAviso } from "../catalogo-actions";
import { CatalogoView } from "../catalogo-view";

export default async function ServiciosPage() {
  const { supabase } = await getAuthorizedProfesional();

  const [items, metricas, pacientesActivos] = await Promise.all([
    obtenerCatalogo(supabase, ["consulta", "paquete"]),
    obtenerMetricasCobros(supabase),
    obtenerPacientesActivosParaAviso(),
  ]);

  return (
    <CatalogoView
      vista="servicios"
      clasesEditor={["consulta", "paquete"]}
      claseDefault="consulta"
      items={items}
      metricas={metricas}
      pacientesActivos={pacientesActivos}
    />
  );
}
