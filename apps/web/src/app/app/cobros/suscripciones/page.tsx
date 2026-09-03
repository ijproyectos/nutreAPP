import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerPlanesSuscripcion, obtenerSuscripciones } from "@/lib/queries/suscripciones";
import { PlanesPanel } from "./planes-panel";
import { NuevaSuscripcionDialog } from "./nueva-suscripcion-dialog";
import { SuscripcionesLista } from "./suscripciones-lista";
import { CobrosTabs } from "../cobros-tabs";

export default async function SuscripcionesPage() {
  const { supabase } = await getAuthorizedProfesional();

  const [planes, suscripciones, { data: pacientes, error: pacientesError }] = await Promise.all([
    obtenerPlanesSuscripcion(supabase),
    obtenerSuscripciones(supabase),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  if (pacientesError) {
    console.error("[SuscripcionesPage] select de pacientes falló:", pacientesError);
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Suscripciones</h1>
          <p className="text-sm text-muted-foreground">
            Cobro recurrente a pacientes — sin pasarela de pago, cada
            período se genera y se marca cobrado a mano.
          </p>
        </div>
        <NuevaSuscripcionDialog pacientes={pacientes ?? []} planes={planes} />
      </div>

      <CobrosTabs activa="suscripciones" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PlanesPanel planes={planes} />
        </div>
        <div className="lg:col-span-2">
          <SuscripcionesLista suscripciones={suscripciones} />
        </div>
      </div>
    </div>
  );
}
