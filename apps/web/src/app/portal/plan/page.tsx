import { getAuthorizedPaciente } from "@/lib/dal";
import { formatoFechaCorta } from "@/lib/format";

// RF-061: el paciente ve el plan vigente. RLS ya filtra a solo `enviado_at
// is not null` (ver planes_select_paciente en 002_rls_policies.sql) —
// nunca puede ver un borrador, esté generado por IA o no.
export default async function MiPlanPage() {
  const { supabase } = await getAuthorizedPaciente();

  const { data: plan } = await supabase
    .from("planes")
    .select("contenido, enviado_at")
    .order("enviado_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl">Mi plan</h1>
        {plan?.enviado_at && (
          <p className="text-sm text-muted-foreground">
            Enviado el {formatoFechaCorta(plan.enviado_at)}
          </p>
        )}
      </div>

      {!plan ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no tenés un plan asignado.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {plan.contenido}
          </pre>
        </div>
      )}
    </div>
  );
}
