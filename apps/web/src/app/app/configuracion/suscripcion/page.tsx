import { CircleCheck } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
};

// Muestra el dato real (profesionales.plan_id, existe desde 001 con
// default 'free') en vez de un mockup completo con precios/tiers
// inventados — no hay ningún plan pago ni feature-gating definido en
// ningún doc del proyecto todavía. Inventar una tabla de precios acá
// sería fabricar una decisión de producto que no es mía para tomar, no
// un detalle técnico — a diferencia del resto de Configuración, donde
// "solo con consumidor real" alcanzaba con no construir un toggle
// decorativo, esto necesita una definición de negocio primero.
export default async function SuscripcionPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("profesionales")
    .select("plan_id, created_at")
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[SuscripcionPage] select falló:", error);
  }

  const planId = data?.plan_id ?? "free";

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Suscripción</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tu plan de NutrIA — distinto de los planes de cobro a pacientes,
        que están en Cobros → Suscripciones.
      </p>

      <div className="flex items-center gap-2.5 rounded-lg bg-muted p-3 text-sm">
        <CircleCheck className="size-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Plan {PLAN_LABEL[planId] ?? planId}</p>
          {data?.created_at && (
            <p className="text-xs text-muted-foreground">
              Desde el alta de tu cuenta.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Todavía no hay otros planes ni cobro online disponibles — cuando
        se defina un plan pago, se agregan acá.
      </p>
    </div>
  );
}
