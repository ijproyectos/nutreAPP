import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Repeat,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerPacientesSinProximoTurno } from "@/lib/queries/pacientes";
import { obtenerLaboratoriosPendientesLargos } from "@/lib/queries/laboratorios";
import { obtenerResumenCobros } from "@/lib/queries/cobros";
import { contarSuscripcionesVencidas } from "@/lib/queries/suscripciones";
import { obtenerCalendarioMes } from "@/lib/queries/calendario";
import {
  obtenerTurnosSinConfirmar,
  obtenerContinuidad,
  obtenerAgendaDeHoy,
  obtenerActividadReciente,
  obtenerPacientesSinRegistrarComida,
} from "@/lib/queries/dashboard";
import { formatoMoneda, tiempoRelativo, formatoFechaCorta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RecordarTurnoButton } from "./recordar-turno-button";
import { AgendaDeHoy } from "./agenda-de-hoy";
import { MiniCalendario } from "./mini-calendario";

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

type Prioridad = "ALTA" | "MEDIA" | "INFO";

type Alerta = {
  prioridad: Prioridad;
  icono: LucideIcon;
  titulo: string;
  subtitulo: string;
  accionLabel: string;
  accionHref: string;
  /** RF-042: cuando está presente, se renderiza un botón "recordar" por
   * turno además del link genérico de la alerta. */
  turnos?: { id: string; pacienteNombre: string }[];
};

export default async function BandejaDeHoyPage(props: PageProps<"/app">) {
  const { supabase, profesional } = await getAuthorizedProfesional();
  const searchParams = await props.searchParams;

  const hoyDate = new Date();
  const hoyISO = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, "0")}-${String(hoyDate.getDate()).padStart(2, "0")}`;
  const mesParam = (searchParams?.mes as string | undefined) || hoyISO.slice(0, 7);

  const [
    sinTurno,
    sinConfirmar,
    cobros,
    continuidad,
    agenda,
    actividad,
    laboratoriosPendientes,
    sinRegistrarComida,
    suscripcionesVencidas,
    diasCalendario,
  ] = await Promise.all([
    obtenerPacientesSinProximoTurno(supabase),
    obtenerTurnosSinConfirmar(supabase),
    obtenerResumenCobros(supabase),
    obtenerContinuidad(supabase),
    obtenerAgendaDeHoy(supabase),
    obtenerActividadReciente(supabase),
    obtenerLaboratoriosPendientesLargos(supabase),
    obtenerPacientesSinRegistrarComida(supabase),
    contarSuscripcionesVencidas(supabase),
    obtenerCalendarioMes(supabase, mesParam),
  ]);

  const alertas: Alerta[] = [];

  if (sinTurno.length > 0) {
    alertas.push({
      prioridad: "ALTA",
      icono: Users,
      titulo: `${sinTurno.length} paciente${sinTurno.length === 1 ? "" : "s"} sin próximo turno`,
      subtitulo: sinTurno
        .slice(0, 3)
        .map((p) => `${p.nombre} (${p.diasSinTurno} días)`)
        .join(" · "),
      accionLabel: "Ver y recuperar",
      accionHref: "/app/pacientes?sin_turno=1",
    });
  }

  if (cobros.cantidadPendiente > 0) {
    alertas.push({
      prioridad: "MEDIA",
      icono: CreditCard,
      titulo: `${formatoMoneda(cobros.totalPendiente)} pendientes de cobro`,
      subtitulo: cobros.masAntiguo
        ? `${cobros.masAntiguo.pacienteNombre} · vence ${formatoFechaCorta(cobros.masAntiguo.fecha)}`
        : `${cobros.cantidadPendiente} consulta(s) sin liquidar`,
      accionLabel: "Ver cobros",
      accionHref: "/app/cobros",
    });
  }

  if (sinConfirmar.length > 0) {
    alertas.push({
      prioridad: "MEDIA",
      icono: CalendarDays,
      titulo: `${sinConfirmar.length} turno${sinConfirmar.length === 1 ? "" : "s"} sin confirmar en las próximas 48h`,
      subtitulo: sinConfirmar
        .slice(0, 2)
        .map(
          (t) =>
            `${t.pacienteNombre} · ${new Date(t.fechaHora).toLocaleString("es-AR", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`
        )
        .join(" · "),
      accionLabel: "Ver agenda",
      accionHref: "/app/agenda",
      turnos: sinConfirmar.slice(0, 3).map((t) => ({ id: t.id, pacienteNombre: t.pacienteNombre })),
    });
  }

  if (laboratoriosPendientes.length > 0) {
    const primero = laboratoriosPendientes[0];
    alertas.push({
      prioridad: "MEDIA",
      icono: FlaskConical,
      titulo: `${laboratoriosPendientes.length} laboratorio${laboratoriosPendientes.length === 1 ? "" : "s"} sin revisar hace más de 48h`,
      subtitulo: `${primero.pacienteNombre} · esperando hace ${Math.floor(primero.horasEsperando / 24)}d`,
      accionLabel: "Revisar",
      accionHref: `/app/pacientes/${primero.pacienteId}`,
    });
  }

  if (suscripcionesVencidas > 0) {
    alertas.push({
      prioridad: "MEDIA",
      icono: Repeat,
      titulo: `${suscripcionesVencidas} suscripción${suscripcionesVencidas === 1 ? "" : "es"} venci${suscripcionesVencidas === 1 ? "ó" : "eron"} sin generar el cobro`,
      subtitulo: "Cobro recurrente a pacientes, seguimiento manual.",
      accionLabel: "Ver suscripciones",
      accionHref: "/app/cobros/suscripciones",
    });
  }

  if (sinRegistrarComida.length > 0) {
    const primero = sinRegistrarComida[0];
    const resto = sinRegistrarComida.length - 1;
    alertas.push({
      prioridad: "INFO",
      icono: ClipboardList,
      titulo: `${primero.nombre} lleva ${primero.diasSinRegistro} días sin registrar comidas`,
      subtitulo:
        (primero.ultimaActividad
          ? `Última actividad ${formatoFechaCorta(primero.ultimaActividad)}`
          : "Sin actividad desde el alta") + (resto > 0 ? ` · +${resto} más` : ""),
      accionLabel: "Ver ficha",
      accionHref: `/app/pacientes/${primero.id}`,
    });
  }

  const turnosHoy = agenda.length;
  const pendientesHoy = agenda.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="p-[38px] pb-[72px]">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-[30px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-[31px] leading-[1.15]">
              {saludo()}, {profesional.nombre}
            </h1>
            <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
              {hoyDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
              {turnosHoy} turno{turnosHoy === 1 ? "" : "s"} · {pendientesHoy} pendiente{pendientesHoy === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" disabled title="Próximamente" className="gap-1.5">
              <Share2 className="size-4" />
              Compartir
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/app/pacientes/nuevo" />}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Nuevo paciente
            </Button>
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

        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-20px_rgba(36,28,44,.16)]">
              <div className="flex items-center justify-between gap-4 border-b border-border px-[22px] pt-[18px] pb-4">
                <div>
                  <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                    Bandeja de hoy
                  </p>
                  <h2 className="mt-1 font-heading text-[21px]">Pendientes de hoy</h2>
                </div>
              </div>

              {alertas.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-11 text-center">
                  <div className="mb-3 flex size-[46px] items-center justify-center rounded-[13px] border border-[#C6CEB6] bg-[#EDF1E7] text-[#5A7645]">
                    <ClipboardList className="size-5" />
                  </div>
                  <p className="font-heading text-[21px]">La bandeja está vacía</p>
                  <p className="mt-1.5 max-w-sm text-[13.5px] text-muted-foreground">
                    No hay pacientes sin turno, cobros vencidos ni turnos sin confirmar ahora mismo.
                  </p>
                </div>
              ) : (
                <div>
                  {alertas.map((a, i) => {
                    const Icono = a.icono;
                    if (a.prioridad === "ALTA") {
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-3 border-b border-border bg-[#FDF7F5] px-[22px] py-5 shadow-[inset_3px_0_0_#B4483A] last:border-b-0"
                        >
                          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] border border-[#EFCFC7] bg-[#FBEAE6] text-destructive">
                            <Icono className="size-5" />
                          </div>
                          <div className="min-w-[240px] flex-1">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[.11em] text-destructive uppercase">
                              <span className="size-1.5 rounded-full bg-[#B4483A]" />
                              Alta
                            </p>
                            <p className="mt-1 truncate text-[16.5px] font-semibold tracking-[-.01em]">
                              {a.titulo}
                            </p>
                            <p className="truncate text-[13px] text-muted-foreground">{a.subtitulo}</p>
                          </div>
                          <Link
                            href={a.accionHref}
                            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2.5 text-[12.5px] font-semibold whitespace-nowrap text-primary-foreground shadow-[0_1px_2px_rgba(60,32,62,.25)] transition-colors hover:bg-[#4A2E4C]"
                          >
                            {a.accionLabel}
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      );
                    }
                    if (a.prioridad === "INFO") {
                      return (
                        <Link
                          key={i}
                          href={a.accionHref}
                          className="flex items-center gap-4 border-b border-border px-[22px] py-3.5 transition-colors last:border-b-0 hover:bg-secondary"
                        >
                          <div className="flex w-[38px] shrink-0 justify-center text-muted-foreground">
                            <Icono className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-[#4C4455]">{a.titulo}</p>
                            <p className="truncate text-xs text-[#A69EAA]">{a.subtitulo}</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                            {a.accionLabel}
                            <ArrowRight className="size-3.5" />
                          </span>
                        </Link>
                      );
                    }
                    // MEDIA
                    return (
                      <div key={i} className="border-b border-border px-[22px] py-[15px] last:border-b-0">
                        <Link href={a.accionHref} className="flex items-center gap-4 transition-colors">
                          <div className="flex w-[38px] shrink-0 justify-center text-[#C4792F]">
                            <Icono className="size-[18px]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-[.11em] text-[#A8631F] uppercase">Media</p>
                            <p className="mt-0.5 truncate text-[14.5px] font-semibold tracking-[-.005em]">
                              {a.titulo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{a.subtitulo}</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-primary">
                            {a.accionLabel}
                            <ArrowRight className="size-3.5" />
                          </span>
                        </Link>
                        {a.turnos && (
                          <div className="mt-2.5 flex flex-wrap gap-2 pl-[54px]">
                            {a.turnos.map((t) => (
                              <RecordarTurnoButton key={t.id} turnoId={t.id} pacienteNombre={t.pacienteNombre} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card px-[22px] pt-5 pb-5 shadow-[0_1px_2px_rgba(36,28,44,.04)]">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                  Agenda de hoy
                </p>
                <Link
                  href="/app/agenda"
                  className="flex items-center gap-1 text-[12.5px] font-bold text-primary whitespace-nowrap"
                >
                  Ver agenda
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <AgendaDeHoy turnos={agenda} />
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-[18px]">
            <MiniCalendario mes={mesParam} dias={diasCalendario} hoy={hoyISO} />

            <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(36,28,44,.04)]">
              <p className="mb-3 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                Esta semana
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[10.5px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                    Continuidad
                  </p>
                  <p className="font-heading text-[23px] tracking-[-.015em] tabular-nums">
                    {continuidad.porcentaje}%
                  </p>
                  <p className="text-xs text-muted-foreground">con próximo turno agendado</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                    Por cobrar
                  </p>
                  <p className="font-heading text-[23px] tracking-[-.015em] tabular-nums">
                    {formatoMoneda(cobros.totalPendiente)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cobros.cantidadPendiente} consulta{cobros.cantidadPendiente === 1 ? "" : "s"} sin liquidar
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card px-[22px] pt-5 pb-3.5 shadow-[0_1px_2px_rgba(36,28,44,.04)]">
              <p className="mb-2.5 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                Actividad reciente
              </p>
              {actividad.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Todavía no hay actividad registrada.
                </p>
              ) : (
                <div className="flex flex-col">
                  {actividad.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-baseline gap-2.5 py-2.5 text-[13px] ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <span className="relative top-[-2px] size-1.5 shrink-0 rounded-full bg-[#C8BFC9]" />
                      <span className="min-w-0 flex-1 text-[#4C4455]">{a.descripcion}</span>
                      <span className="shrink-0 text-[11.5px] text-[#A69EAA]">{tiempoRelativo(a.fecha)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
