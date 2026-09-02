import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerPacientesSinProximoTurno } from "@/lib/queries/pacientes";
import { edadDesde, formatoFechaCorta, tiempoRelativo } from "@/lib/format";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PacientesFiltros } from "./pacientes-filtros";

type Turno = { paciente_id: string; fecha_hora: string; created_at: string };

/** PostgREST usa `,` y `()` como separadores dentro de la sintaxis de
 * `.or()` — sin escapar, una búsqueda con coma o paréntesis (ej. "García,
 * Juan") rompe el parseo del filtro. Envolver el valor en comillas dobles
 * lo trata como literal; el `%` de ilike sigue funcionando igual adentro. */
function valorFiltroPostgrest(valor: string): string {
  return `"${valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export default async function PacientesPage(
  props: PageProps<"/app/pacientes">
) {
  const { supabase } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;

  const q = (searchParams?.q as string | undefined)?.trim() || "";
  const estadoParam = (searchParams?.estado as string | undefined) || "activos";
  const soloSinTurno = searchParams?.sin_turno === "1";

  let query = supabase
    .from("pacientes")
    .select("id, nombre, telefono, fecha_nacimiento, estado, created_at")
    .order("nombre", { ascending: true });

  if (estadoParam !== "todos") {
    query = query.eq(
      "estado",
      estadoParam === "archivados" ? "archivado" : "activo"
    );
  }
  if (q) {
    const term = valorFiltroPostgrest(`%${q}%`);
    query = query.or(`nombre.ilike.${term},telefono.ilike.${term}`);
  }

  const [{ data: pacientes, error: pacientesError }, alertaSinTurno] =
    await Promise.all([query, obtenerPacientesSinProximoTurno(supabase)]);

  if (pacientesError) {
    console.error("[PacientesPage] select de pacientes falló:", pacientesError);
  }

  const ids = (pacientes ?? []).map((p) => p.id);
  const { data: turnos } = ids.length
    ? await supabase
        .from("turnos")
        .select("paciente_id, fecha_hora, created_at")
        .in("paciente_id", ids)
        .neq("estado", "cancelado")
    : { data: [] as Turno[] };

  const now = new Date().getTime();
  const turnosPorPaciente = new Map<string, Turno[]>();
  for (const t of (turnos ?? []) as Turno[]) {
    const list = turnosPorPaciente.get(t.paciente_id) ?? [];
    list.push(t);
    turnosPorPaciente.set(t.paciente_id, list);
  }

  const sinTurnoIds = new Set(alertaSinTurno.map((p) => p.id));

  const filas = (pacientes ?? []).map((p) => {
    const propios = turnosPorPaciente.get(p.id) ?? [];
    const proximo = propios
      .filter((t) => new Date(t.fecha_hora).getTime() > now)
      .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))[0];
    const ultima = propios
      .filter((t) => new Date(t.fecha_hora).getTime() <= now)
      .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))[0];
    const actividad = propios.reduce(
      (max, t) => (t.created_at > max ? t.created_at : max),
      p.created_at
    );
    return { ...p, proximo, ultima, actividad };
  });

  const filasVisibles = soloSinTurno
    ? filas.filter((f) => sinTurnoIds.has(f.id))
    : filas;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de pacientes del consultorio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled title="Próximamente">
            Importar pacientes
          </Button>
          <Button
            variant="default"
            nativeButton={false}
            render={<Link href="/app/pacientes/nuevo" />}
            className="gap-1.5"
          >
            <UserPlus className="size-4" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      {alertaSinTurno.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-accent-foreground/15 bg-accent px-4 py-3 text-sm text-accent-foreground">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4" />
            <strong>{alertaSinTurno.length}</strong> paciente
            {alertaSinTurno.length === 1 ? "" : "s"} no{" "}
            {alertaSinTurno.length === 1 ? "tiene" : "tienen"} próximo turno
            agendado.
          </span>
          <Link href="/app" className="shrink-0 font-medium hover:underline">
            Ver en la Bandeja de hoy →
          </Link>
        </div>
      )}

      <PacientesFiltros sinTurnoCount={alertaSinTurno.length} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Última consulta</TableHead>
              <TableHead>Continuidad</TableHead>
              <TableHead>Actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasVisibles.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No hay pacientes que coincidan con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {filasVisibles.map((p) => {
              const edad = edadDesde(p.fecha_nacimiento);
              const iniciales = p.nombre
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((s: string) => s[0]?.toUpperCase())
                .join("");
              return (
                <TableRow
                  key={p.id}
                  className={
                    sinTurnoIds.has(p.id)
                      ? "border-l-2 border-l-destructive"
                      : ""
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                        {iniciales}
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/app/pacientes/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.nombre}
                        </Link>
                        {edad !== null && (
                          <span className="text-xs text-muted-foreground">
                            {edad} años
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.telefono || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.ultima ? formatoFechaCorta(p.ultima.fecha_hora) : "—"}
                  </TableCell>
                  <TableCell>
                    {p.proximo ? (
                      formatoFechaCorta(p.proximo.fecha_hora)
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-accent-foreground/20 bg-accent text-accent-foreground"
                        >
                          Sin próximo turno
                        </Badge>
                        <Link
                          href={`/app/agenda?paciente=${p.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Agendar
                        </Link>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tiempoRelativo(p.actividad)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando 1 a {filasVisibles.length} de {filasVisibles.length}{" "}
        resultados
      </p>
    </div>
  );
}
