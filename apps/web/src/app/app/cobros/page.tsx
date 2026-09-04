import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerCobros, obtenerMetricasCobros } from "@/lib/queries/cobros";
import { obtenerCatalogo } from "@/lib/queries/catalogo";
import { formatoMoneda, formatoFechaCorta } from "@/lib/format";
import { NuevoCobroDialog } from "./nuevo-cobro-dialog";
import { MarcarCobradoButton } from "./marcar-cobrado-button";
import { CobrosFiltros } from "./cobros-filtros";
import { CobrosTabs } from "./cobros-tabs";
import { MetricasCobrosCards } from "./metricas-cobros";

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "border-[#E8D6BC] bg-[#FBF3E9] text-[#8A5417]",
  cobrado: "border-[#C6CEB6] bg-positive text-positive-foreground",
  vencido: "border-[#E7C2BC] bg-[#F9EAE8] text-destructive",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  cobrado: "Cobrado",
  vencido: "Vencido",
};

export default async function CobrosPage(props: PageProps<"/app/cobros">) {
  const { supabase } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;
  const estadoParam = (searchParams?.estado as string | undefined) ?? "pendiente";
  const estado =
    estadoParam === "pendiente" || estadoParam === "cobrado" ? estadoParam : undefined;
  // Deep-link desde el chat de un paciente (chip "Cobrar" del rediseño) —
  // /app/cobros?paciente=<id> abre directo el diálogo con ese paciente
  // preseleccionado.
  const pacienteIdInicial = (searchParams?.paciente as string | undefined) || null;

  const [cobros, metricas, { data: pacientes, error: pacientesError }, servicios] =
    await Promise.all([
      obtenerCobros(supabase, estado),
      obtenerMetricasCobros(supabase),
      supabase
        .from("pacientes")
        .select("id, nombre")
        .eq("estado", "activo")
        .order("nombre", { ascending: true }),
      obtenerCatalogo(supabase, ["consulta", "paquete", "producto"]),
    ]);
  if (pacientesError) {
    console.error("[CobrosPage] select de pacientes falló:", pacientesError);
  }

  return (
    <div className="p-[38px] pb-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-[26px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-[31px] leading-[1.15] tracking-[-.01em]">
              Pagos
            </h1>
            <p className="mt-[7px] text-sm text-muted-foreground">
              Registro manual de cobros — sin cobro online integrado todavía.
            </p>
          </div>
          <NuevoCobroDialog
            pacientes={pacientes ?? []}
            servicios={servicios.map((s) => ({ id: s.id, nombre: s.nombre, precio: s.precio }))}
            pacienteIdInicial={pacienteIdInicial}
          />
        </div>

        <MetricasCobrosCards metricas={metricas} />

        <div className="mb-[18px] flex flex-wrap items-center gap-3">
          <CobrosTabs activa="pagos" />
          <CobrosFiltros />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-22px_rgba(36,28,44,.16)]">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_128px_132px_148px_40px] items-center gap-4 border-b border-[#F2EBF0] bg-secondary px-[22px] py-2.5 sm:grid">
            <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
              Paciente y servicio
            </span>
            <span className="text-right text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
              Monto
            </span>
            <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
              Fecha
            </span>
            <span className="text-[10px] font-bold tracking-[.11em] text-muted-foreground uppercase">
              Estado
            </span>
            <span />
          </div>

          {cobros.length === 0 && (
            <p className="px-[22px] py-8 text-center text-sm text-muted-foreground">
              No hay cobros que coincidan con este filtro.
            </p>
          )}

          {cobros.map((c) => (
            <div
              key={c.id}
              className={`grid grid-cols-1 items-center gap-2 border-b border-[#F5EFF4] px-[22px] py-3.5 last:border-0 sm:grid-cols-[minmax(0,2.4fr)_128px_132px_148px_40px] sm:gap-4 ${
                c.estadoVisual === "vencido" ? "bg-[#FDF7F6] shadow-[inset_3px_0_0_#B4483A]" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary">
                  {c.pacienteNombre
                    .split(" ")
                    .filter((p) => p.length > 2)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.pacienteNombre}</p>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {c.consulta ? `Consulta del ${formatoFechaCorta(c.consulta.fecha)}` : "Cobro manual"}
                  </p>
                </div>
              </div>
              <div className="text-left text-[15px] font-semibold tabular-nums sm:text-right">
                {formatoMoneda(c.monto)}
              </div>
              <div className="text-[12.5px] tabular-nums text-[#4C4455]">
                {c.fechaVencimiento ? formatoFechaCorta(c.fechaVencimiento) : "—"}
              </div>
              <div className="min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap ${ESTADO_ESTILO[c.estadoVisual]}`}
                >
                  {ESTADO_LABEL[c.estadoVisual]}
                </span>
              </div>
              {c.estadoVisual !== "cobrado" ? (
                <MarcarCobradoButton cobroId={c.id} />
              ) : (
                <span />
              )}
            </div>
          ))}

          <div className="bg-[#FCFAFC] px-[22px] py-3 text-[12.5px] tabular-nums text-muted-foreground">
            {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })} ·{" "}
            {formatoMoneda(metricas.entroEsteMes)} cobrado, {formatoMoneda(metricas.faltaCobrar)}{" "}
            pendiente
          </div>
        </div>
      </div>
    </div>
  );
}
