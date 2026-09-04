import { getAuthorizedPaciente } from "@/lib/dal";
import { formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SubirLaboratorioDialog } from "./subir-laboratorio-dialog";

const ESTADO_ESTILO: Record<string, string> = {
  pendiente_revision: "bg-accent text-accent-foreground border-transparent",
  validado: "bg-positive text-positive-foreground border-transparent",
  rechazado: "bg-destructive/10 text-destructive border-transparent",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente_revision: "Pendiente de revisión",
  validado: "Validado",
  rechazado: "Rechazado",
};

export default async function MisLaboratoriosPage() {
  const { supabase } = await getAuthorizedPaciente();

  const { data: laboratorios } = await supabase
    .from("laboratorios")
    .select("id, fecha_estudio, estado, valores, notas_profesional, created_at")
    .order("fecha_estudio", { ascending: false });

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl">
            Mis laboratorios
          </h1>
          <p className="text-sm text-muted-foreground">
            Subí tus estudios para que tu nutricionista los tenga en cuenta
            en tu plan.
          </p>
        </div>
        <SubirLaboratorioDialog />
      </div>

      {(!laboratorios || laboratorios.length === 0) && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no subiste ningún laboratorio.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(laboratorios ?? []).map((lab) => {
          const valores = (lab.valores ?? {}) as Record<string, number>;
          const claves = Object.keys(valores);
          return (
            <div
              key={lab.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {formatoFechaCorta(lab.fecha_estudio)}
                </span>
                <Badge className={ESTADO_ESTILO[lab.estado]}>
                  {ESTADO_LABEL[lab.estado] ?? lab.estado}
                </Badge>
              </div>
              {claves.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {claves.map((clave) => (
                    <span
                      key={clave}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {clave.replace(/_/g, " ")}: {valores[clave]}
                    </span>
                  ))}
                </div>
              )}
              {lab.notas_profesional && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Nota de tu nutricionista:{" "}
                  </span>
                  {lab.notas_profesional}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
