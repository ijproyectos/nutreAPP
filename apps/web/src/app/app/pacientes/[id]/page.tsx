import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { edadDesde, formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LaboratorioReviewCard } from "./laboratorio-review-card";
import { PlanIAPanel } from "./plan-ia-panel";

const ESTADO_ESTILO: Record<string, string> = {
  validado: "bg-emerald-100 text-emerald-800 border-transparent",
  rechazado: "bg-destructive/10 text-destructive border-transparent",
};

const ESTADO_LABEL: Record<string, string> = {
  validado: "Validado",
  rechazado: "Rechazado",
};

export default async function FichaPacientePage(
  props: PageProps<"/app/pacientes/[id]">
) {
  const { id } = await props.params;
  const { supabase } = await getAuthorizedProfesional();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, telefono, email, fecha_nacimiento, estado")
    .eq("id", id)
    .maybeSingle();

  if (!paciente) notFound();

  const { data: laboratorios } = await supabase
    .from("laboratorios")
    .select(
      "id, fecha_estudio, estado, valores, notas_profesional, archivo_url, created_at"
    )
    .eq("paciente_id", id)
    .order("fecha_estudio", { ascending: false });

  const urlsFirmadas = new Map<string, string>();
  for (const lab of laboratorios ?? []) {
    const { data } = await supabase.storage
      .from("laboratorios")
      .createSignedUrl(lab.archivo_url, 300);
    if (data?.signedUrl) urlsFirmadas.set(lab.id, data.signedUrl);
  }

  const edad = edadDesde(paciente.fecha_nacimiento);
  const pendientes = (laboratorios ?? []).filter(
    (l) => l.estado === "pendiente_revision"
  );
  const revisados = (laboratorios ?? []).filter(
    (l) => l.estado !== "pendiente_revision"
  );

  const { data: planes } = await supabase
    .from("planes")
    .select("id, contenido, estado, generado_con_ia, enviado_at, created_at")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false });

  const planActivoRow = (planes ?? []).find((p) => p.estado !== "enviado");
  const planActivo = planActivoRow
    ? {
        id: planActivoRow.id,
        contenido: planActivoRow.contenido,
        estado: planActivoRow.estado as "borrador_ia" | "editado_manual",
        generado_con_ia: planActivoRow.generado_con_ia,
      }
    : null;
  const planesEnviados = (planes ?? [])
    .filter((p) => p.estado === "enviado" && p.enviado_at)
    .map((p) => ({ id: p.id, enviado_at: p.enviado_at as string }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link
          href="/app/pacientes"
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Pacientes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-primary">
            {paciente.nombre}
          </h1>
          <Badge variant="outline">
            {paciente.estado === "activo" ? "Activo" : "Archivado"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {edad !== null && `${edad} años · `}
          {paciente.telefono || "sin teléfono"} · {paciente.email}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Laboratorios</h2>

        {(!laboratorios || laboratorios.length === 0) && (
          <p className="text-sm text-muted-foreground">
            Este paciente todavía no subió ningún laboratorio.
          </p>
        )}

        {pendientes.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendientes.map((lab) => (
              <LaboratorioReviewCard
                key={lab.id}
                laboratorio={{
                  id: lab.id,
                  fecha_estudio: lab.fecha_estudio,
                  valores: (lab.valores ?? {}) as Record<string, number>,
                  notas_profesional: lab.notas_profesional,
                }}
                archivoUrl={urlsFirmadas.get(lab.id) ?? null}
              />
            ))}
          </div>
        )}

        {revisados.length > 0 && (
          <div className="flex flex-col gap-3">
            {revisados.map((lab) => {
              const valores = (lab.valores ?? {}) as Record<string, number>;
              return (
                <div
                  key={lab.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {formatoFechaCorta(lab.fecha_estudio)}
                    </span>
                    <div className="flex items-center gap-3">
                      <Badge className={ESTADO_ESTILO[lab.estado]}>
                        {ESTADO_LABEL[lab.estado] ?? lab.estado}
                      </Badge>
                      {urlsFirmadas.get(lab.id) && (
                        <a
                          href={urlsFirmadas.get(lab.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Ver archivo →
                        </a>
                      )}
                    </div>
                  </div>
                  {Object.keys(valores).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(valores).map(([clave, valor]) => (
                        <span
                          key={clave}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {clave.replace(/_/g, " ")}: {valor}
                        </span>
                      ))}
                    </div>
                  )}
                  {lab.notas_profesional && (
                    <p className="text-sm text-muted-foreground">
                      {lab.notas_profesional}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Plan alimentario</h2>
        <PlanIAPanel
          // Fuerza remount cuando cambia la identidad del plan activo (de
          // null a un id recién generado, o a un id nuevo tras
          // "Regenerar con IA") — si no, PlanIAPanel reusa la instancia y
          // el useState local de `contenido` queda con el valor inicial
          // ("" cuando no había plan), mostrando el textarea vacío aunque
          // planActivo.contenido ya tenga el plan generado.
          key={planActivo?.id ?? "sin-plan"}
          pacienteId={paciente.id}
          planActivo={planActivo}
          planesEnviados={planesEnviados}
        />
      </section>
    </div>
  );
}
