import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerCatalogo } from "@/lib/queries/catalogo";
import { obtenerMetricasCobros } from "@/lib/queries/cobros";
import { obtenerPacientesActivosParaAviso } from "../catalogo-actions";
import { CatalogoView } from "../catalogo-view";

export default async function ProductosPage() {
  const { supabase } = await getAuthorizedProfesional();

  const [items, metricas, pacientesActivos] = await Promise.all([
    obtenerCatalogo(supabase, ["producto"]),
    obtenerMetricasCobros(supabase),
    obtenerPacientesActivosParaAviso(),
  ]);

  return (
    <CatalogoView
      vista="productos"
      clasesEditor={["producto"]}
      claseDefault="producto"
      items={items}
      metricas={metricas}
      pacientesActivos={pacientesActivos}
    />
  );
}
