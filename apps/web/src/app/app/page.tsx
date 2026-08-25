import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerPacientesSinProximoTurno } from "@/lib/queries/pacientes";
import { obtenerLaboratoriosPendientesLargos } from "@/lib/queries/laboratorios";
import {
  obtenerTurnosSinConfirmar,
  obtenerResumenCobros,
  obtenerContinuidad,
  obtenerAgendaDeHoy,
  obtenerActividadReciente,
} from "@/lib/queries/dashboard";
import { formatoMoneda, tiempoRelativo, formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NuevoPacienteDialog } from "./pacientes/nuevo-paciente-dialog";
import { RecordarTurnoButton } from "./recordar-turno-button";

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_curso: "En curso",
};

type Prioridad = "ALTA" | "MEDIA";

type Alerta = {
  prioridad: Prioridad;
  titulo: string;
  subtitulo: string;
  accionLabel: string;
  accionHref: string;
  /** RF-042: cuando está presente, se renderiza un botón "recordar" por
   * turno además del link genérico de la alerta. */
  turnos?: { id: string; pacienteNombre: string }[];
};

const PRIORIDAD_ESTILO: Record<Prioridad, string> = {
  ALTA: "text-destructive",
  MEDIA: "text-accent-foreground",
};

export default async function BandejaDeHoyPage() {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const [
    sinTurno,
    sinConfirmar,
    cobros,
    continuidad,
    agenda,
    actividad,
    laboratoriosPendientes,
  ] = await Promise.all([
    obtenerPacientesSinProximoTurno(supabase),
    obtenerTurnosSinConfirmar(supabase),
    obtenerResumenCobros(supabase),
    obtenerContinuidad(supabase),
    obtenerAgendaDeHoy(supabase),
    obtenerActividadReciente(supabase),
    obtenerLaboratoriosPendientesLargos(supabase),
  ]);

  const alertas: Alerta[] = [];

  if (sinTurno.length > 0) {
    alertas.push({
      prioridad: "ALTA",
      titulo: `${sinTurno.length} paciente${
        sinTurno.length === 1 ? "" : "s"
      } sin próximo turno`,
      subtitulo: sinTurno
        .slice(0, 3)
        .map((p) => `${p.nombre} (${p.diasSinTurno} días)`)
        .join(" · "),
      accionLabel: "Ver y recuperar →",
      accionHref: "/app/pacientes?sin_turno=1",
    });
  }

  if (cobros.cantidadPendiente > 0) {
    alertas.push({
      prioridad: "MEDIA",
      titulo: `${formatoMoneda(cobros.totalPendiente)} pendientes de cobro`,
      subtitulo: cobros.masAntiguo
        ? `${cobros.masAntiguo.pacienteNombre} · vence ${formatoFechaCorta(
            cobros.masAntiguo.fecha
          )}`
        : `${cobros.cantidadPendiente} consulta(s) sin liquidar`,
      accionLabel: "Ver cobros →",
      accionHref: "/app/cobros",
    });
  }

  if (sinConfirmar.length > 0) {
    alertas.push({
      prioridad: "MEDIA",
      titulo: `${sinConfirmar.length} turno${
        sinConfirmar.length === 1 ? "" : "s"
      } sin confirmar en las próximas 48h`,
      subtitulo: sinConfirmar
        .slice(0, 2)
        .map(
          (t) =>
            `${t.pacienteNombre} · ${new Date(t.fechaHora).toLocaleString(
              "es-AR",
              { weekday: "short", hour: "2-digit", minute: "2-digit" }
            )}`
        )
        .join(" · "),
      accionLabel: "Ver agenda →",
      accionHref: "/app/agenda",
      turnos: sinConfirmar.slice(0, 3).map((t) => ({
        id: t.id,
        pacienteNombre: t.pacienteNombre,
      })),
    });
  }

  if (laboratoriosPendientes.length > 0) {
    const primero = laboratoriosPendientes[0];
    alertas.push({
      prioridad: "MEDIA",
      titulo: `${laboratoriosPendientes.length} laboratorio${
        laboratoriosPendientes.length === 1 ? "" : "s"
      } sin revisar hace más de 48h`,
      subtitulo: `${primero.pacienteNombre} · esperando hace ${Math.floor(
        primero.horasEsperando / 24
      )}d`,
      accionLabel: "Revisar →",
      accionHref: `/app/pacientes/${primero.pacienteId}`,
    });
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {saludo()}, {profesional.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Esto es lo que hoy necesita tu atención.
          </p>
        </div>
        <div className="flex gap-2">
          <NuevoPacienteDialog />
          <Button
            variant="default"
            nativeButton={false}
            render={<Link href="/app/agenda" />}
            className="gap-1.5"
          >
            <CalendarPlus className="size-4" />
            Nuevo turno
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                BANDEJA DE HOY
              </p>
              <h2 className="text-lg font-semibold">
                {alertas.length > 0
                  ? `${alertas.length} cosa${
                      alertas.length === 1 ? "" : "s"
                    } se te ${
                      alertas.length === 1 ? "puede" : "pueden"
                    } estar escapando`
                  : "Todo al día — no hay alertas pendientes"}
              </h2>
            </div>
            {alertas.length > 0 && (
              <Badge className="bg-accent text-accent-foreground">
                {alertas.length} pendiente{alertas.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          <div className="flex flex-col divide-y divide-border">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-4 py-3 pl-3 ${
                  a.prioridad === "ALTA" ? "border-l-2 border-l-destructive" : ""
                }`}
              >
                <div>
                  <p
                    className={`flex items-center gap-1.5 text-xs font-medium tracking-wide ${PRIORIDAD_ESTILO[a.prioridad]}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {a.prioridad}
                  </p>
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.subtitulo}
                  </p>
                  {a.turnos && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.turnos.map((t) => (
                        <RecordarTurnoButton
                          key={t.id}
                          turnoId={t.id}
                          pacienteNombre={t.pacienteNombre}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href={a.accionHref}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  {a.accionLabel}
                </Link>
              </div>
            ))}
            {alertas.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay pacientes sin turno, turnos sin confirmar ni cobros
                pendientes ahora mismo.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            ESTA SEMANA
          </p>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              CONTINUIDAD
            </p>
            <p className="text-2xl font-bold">{continuidad.porcentaje}%</p>
            <p className="text-xs text-muted-foreground">
              con próximo turno agendado
            </p>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              POR COBRAR
            </p>
            <p className="text-2xl font-bold">
              {formatoMoneda(cobros.totalPendiente)}
            </p>
            <p className="text-xs text-muted-foreground">
              {cobros.cantidadPendiente} consulta
              {cobros.cantidadPendiente === 1 ? "" : "s"} sin liquidar
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Adherencia y pacientes recuperados van a aparecer acá cuando haya
            más historial de registros.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              AGENDA DE HOY
            </p>
            <Link
              href="/app/agenda"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver agenda <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {agenda.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tenés turnos agendados para hoy.
            </p>
          )}

          <div className="flex flex-col divide-y divide-border">
            {agenda.map((t) => (
              <div key={t.id} className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {new Date(t.fechaHora).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-medium">{t.pacienteNombre}</span>
                    <span className="text-muted-foreground">
                      · {t.tipo === "presencial" ? "presencial" : "videollamada"}
                    </span>
                  </div>
                  <Badge
                    variant={t.estado === "pendiente" ? "outline" : "secondary"}
                  >
                    {ESTADO_LABEL[t.estado] ?? t.estado}
                  </Badge>
                </div>

                {t.brief && (
                  <div className="ml-0 flex flex-col gap-1.5 rounded-lg bg-muted p-3 text-sm">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground">
                      BRIEF DE CONTINUIDAD
                    </p>
                    {t.brief.acordado && (
                      <p>
                        <span className="text-xs font-medium tracking-wide text-muted-foreground">
                          ACORDADO —{" "}
                        </span>
                        {t.brief.acordado}
                      </p>
                    )}
                    {t.brief.completo && (
                      <p>
                        <span className="text-xs font-medium tracking-wide text-muted-foreground">
                          COMPLETÓ —{" "}
                        </span>
                        {t.brief.completo}
                      </p>
                    )}
                    {t.brief.cambio && (
                      <p>
                        <span className="text-xs font-medium tracking-wide text-muted-foreground">
                          CAMBIÓ —{" "}
                        </span>
                        {t.brief.cambio}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
            ACTIVIDAD RECIENTE
          </p>
          {actividad.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay actividad registrada.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {actividad.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-foreground" />
                  <span className="flex-1">{a.descripcion}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tiempoRelativo(a.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
