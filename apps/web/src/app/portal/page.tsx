import Link from "next/link";
import { ArrowRight, ClipboardList, NotebookPen } from "lucide-react";
import { getAuthorizedPaciente } from "@/lib/dal";
import { formatoFechaCorta } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmarTurnoButton } from "./turnos/confirmar-turno-button";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
};

// RF-080: próximo turno + confirmar, plan vigente (resumen), acceso
// directo a registrar comida/peso. Chat (RF-083) sigue placeholder — no
// es parte de este pase (Agenda + lo directamente atado a turnos).
export default async function PortalDashboardPage() {
  const { supabase, paciente } = await getAuthorizedPaciente();

  const [{ data: proximoTurno }, { data: plan }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, fecha_hora, tipo, estado")
      .gte("fecha_hora", new Date().toISOString())
      .neq("estado", "cancelado")
      .order("fecha_hora", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("planes")
      .select("contenido, enviado_at")
      .order("enviado_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Hola, {paciente.nombre} 👋</CardTitle>
          <CardDescription>
            Esto es lo que tenés hoy con tu nutricionista.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
          PRÓXIMO TURNO
        </p>
        {!proximoTurno ? (
          <p className="text-sm text-muted-foreground">
            No tenés turnos agendados por ahora.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {formatoFechaCorta(proximoTurno.fecha_hora)} ·{" "}
                {new Date(proximoTurno.fecha_hora).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {proximoTurno.tipo === "presencial" ? "Presencial" : "Videollamada"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {ESTADO_LABEL[proximoTurno.estado] ?? proximoTurno.estado}
              </Badge>
              {proximoTurno.estado === "pendiente" && (
                <ConfirmarTurnoButton turnoId={proximoTurno.id} />
              )}
            </div>
          </div>
        )}
        <Link
          href="/portal/turnos"
          className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver mis turnos <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
          MI PLAN
        </p>
        {!plan ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés un plan asignado.
          </p>
        ) : (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {plan.contenido}
          </p>
        )}
        <Link
          href="/portal/plan"
          className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ClipboardList className="size-3.5" />
          Ver plan completo
        </Link>
      </div>

      <Button
        variant="outline"
        className="h-auto justify-start gap-2 p-4"
        nativeButton={false}
        render={<Link href="/portal/registro" />}
      >
        <NotebookPen className="size-4" />
        <div className="flex flex-col items-start text-left">
          <span className="font-medium">Registrar comida o peso</span>
          <span className="text-xs text-muted-foreground">
            Contale a tu nutricionista cómo vas hoy
          </span>
        </div>
      </Button>
    </div>
  );
}
