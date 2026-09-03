import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerCobros, obtenerResumenCobros } from "@/lib/queries/cobros";
import { formatoMoneda, formatoFechaCorta } from "@/lib/format";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NuevoCobroDialog } from "./nuevo-cobro-dialog";
import { MarcarCobradoButton } from "./marcar-cobrado-button";
import { CobrosFiltros } from "./cobros-filtros";

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "border-transparent bg-accent text-accent-foreground",
  cobrado: "border-transparent bg-emerald-100 text-emerald-800",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  cobrado: "Cobrado",
};

export default async function CobrosPage(props: PageProps<"/app/cobros">) {
  const { supabase } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;
  const estadoParam = (searchParams?.estado as string | undefined) ?? "pendiente";
  const estado =
    estadoParam === "pendiente" || estadoParam === "cobrado" ? estadoParam : undefined;

  const [cobros, resumen, { data: pacientes, error: pacientesError }] = await Promise.all([
    obtenerCobros(supabase, estado),
    obtenerResumenCobros(supabase),
    supabase
      .from("pacientes")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);
  if (pacientesError) {
    console.error("[CobrosPage] select de pacientes falló:", pacientesError);
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cobros</h1>
          <p className="text-sm text-muted-foreground">
            Registro manual de cobros — sin cobro online integrado todavía.
          </p>
        </div>
        <NuevoCobroDialog pacientes={pacientes ?? []} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            POR COBRAR
          </p>
          <p className="text-2xl font-bold">{formatoMoneda(resumen.totalPendiente)}</p>
          <p className="text-xs text-muted-foreground">
            {resumen.cantidadPendiente} cobro{resumen.cantidadPendiente === 1 ? "" : "s"}{" "}
            pendiente{resumen.cantidadPendiente === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            MÁS ANTIGUO SIN COBRAR
          </p>
          {resumen.masAntiguo ? (
            <>
              <p className="text-lg font-semibold">{resumen.masAntiguo.pacienteNombre}</p>
              <p className="text-xs text-muted-foreground">
                vence {formatoFechaCorta(resumen.masAntiguo.fecha)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nada pendiente ahora mismo.</p>
          )}
        </div>
      </div>

      <CobrosFiltros />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Consulta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cobros.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay cobros que coincidan con este filtro.
                </TableCell>
              </TableRow>
            )}
            {cobros.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.pacienteNombre}</TableCell>
                <TableCell>{formatoMoneda(c.monto)}</TableCell>
                <TableCell>
                  {c.fechaVencimiento ? formatoFechaCorta(c.fechaVencimiento) : "—"}
                </TableCell>
                <TableCell>
                  {c.consulta ? formatoFechaCorta(c.consulta.fecha) : "—"}
                </TableCell>
                <TableCell>
                  <Badge className={ESTADO_ESTILO[c.estado]}>
                    {ESTADO_LABEL[c.estado]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {c.estado === "pendiente" && <MarcarCobradoButton cobroId={c.id} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
