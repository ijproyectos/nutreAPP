import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Check, MessageSquare, CalendarPlus } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { edadDesde, formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LaboratorioReviewCard } from "./laboratorio-review-card";
import { PlanIAPanel } from "./plan-ia-panel";
import { HistoriaClinicaPanel } from "./historia-clinica-panel";
import { PedirSeccionButton } from "./pedir-seccion-button";
import { FichaTabs } from "./ficha-tabs";
import type { Seccion } from "@/app/onboarding/invitacion/[token]/wizard-actions";

const SECCIONES_PERFIL: { key: Seccion; label: string; detalle: string }[] = [
  { key: "datos_personales", label: "Datos personales", detalle: "Nombre, nacimiento, sexo biológico" },
  { key: "contacto", label: "Contacto", detalle: "Teléfono y WhatsApp confirmados" },
  { key: "antecedentes", label: "Antecedentes de salud", detalle: "Condiciones, alergias, medicación" },
  { key: "habitos", label: "Hábitos y actividad", detalle: "Comidas, quién cocina, movimiento" },
  { key: "consentimiento", label: "Consentimiento", detalle: "Uso de datos clínicos" },
];

const EVENTO_DESCRIPCION: Record<string, string> = {
  enviado_whatsapp: "Se envió el link por WhatsApp",
  abierto: "Abrió el link",
};

const SECCION_LABEL: Record<string, string> = Object.fromEntries(
  SECCIONES_PERFIL.map((s) => [s.key, s.label])
);

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
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data: paciente, error: pacienteError } = await supabase
    .from("pacientes")
    .select(
      `id, nombre, telefono, email, fecha_nacimiento, estado, notas_generales,
       datos_personales_completado_at, contacto_completado_at,
       antecedentes_completado_at, habitos_completado_at,
       consentimiento_completado_at`
    )
    .eq("id", id)
    .maybeSingle();

  // Distinguir "no existe" de "la query falló" — sin esto, cualquier error
  // real de Postgres acá (columna que no existe, RLS mal configurada, lo
  // que sea) se disfraza de 404 en vez de mostrar el problema real. Pasó
  // en producción: notas_generales no existía todavía en la DB en vivo y
  // esto tiraba 404 en cualquier ficha de paciente sin loguear nada.
  if (pacienteError) {
    console.error("[FichaPacientePage] select de pacientes falló:", {
      message: pacienteError.message,
      code: pacienteError.code,
      details: pacienteError.details,
      hint: pacienteError.hint,
    });
    throw new Error("No se pudo cargar la ficha del paciente.");
  }
  if (!paciente) notFound();

  // Completitud del perfil + "Actividad del link" (mockup "En la ficha",
  // ver 008/009). La invitación más reciente es la relevante — un
  // paciente solo tiene una activa/aceptada a la vez en la práctica.
  const { data: invitacion } = await supabase
    .from("invitaciones")
    .select("id, token")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: eventosInvitacion } = invitacion
    ? await supabase
        .from("invitacion_eventos")
        .select("tipo, seccion, created_at")
        .eq("invitacion_id", invitacion.id)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: null };

  const headersList = await headers();
  const host = headersList.get("host") ?? "nutriar.netlify.app";
  const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
  const linkInvitacion = invitacion
    ? `${origin}/onboarding/invitacion/${invitacion.token}`
    : null;

  const { data: mediciones } = await supabase
    .from("mediciones")
    .select("id, fecha, peso")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false });

  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, fecha_hora, tipo, estado")
    .eq("paciente_id", id)
    .order("fecha_hora", { ascending: false });

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

  const ahora = new Date();
  const proximoTurno = (turnos ?? [])
    .filter((t) => t.estado !== "cancelado" && new Date(t.fecha_hora) > ahora)
    .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))[0];

  const { data: planes } = await supabase
    .from("planes")
    .select("id, contenido, estado, generado_con_ia, enviado_at, created_at")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false });

  // Configuración → Planes alimentarios (013_configuracion_consultorio.sql).
  const { data: preferenciasPlan } = await supabase
    .from("profesionales")
    .select("plantilla_plan_alimentario")
    .eq("id", profesional.id)
    .maybeSingle();

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

  const completadoAtPorSeccion: Record<Seccion, string | null> = {
    datos_personales: paciente.datos_personales_completado_at,
    contacto: paciente.contacto_completado_at,
    antecedentes: paciente.antecedentes_completado_at,
    habitos: paciente.habitos_completado_at,
    consentimiento: paciente.consentimiento_completado_at,
  };
  const seccionesCompletitud = SECCIONES_PERFIL.map((s) => ({
    ...s,
    completadoAt: completadoAtPorSeccion[s.key],
  }));
  const seccionesPendientes = seccionesCompletitud.filter(
    (s) => !s.completadoAt
  );
  const porcentajeCompletitud = Math.round(
    ((SECCIONES_PERFIL.length - seccionesPendientes.length) /
      SECCIONES_PERFIL.length) *
      100
  );

  const datosContacto = [
    paciente.telefono ? paciente.telefono : null,
    paciente.email,
  ]
    .filter(Boolean)
    .join(" · ");

  const historiaContent = (
    <HistoriaClinicaPanel
      // Fuerza remount al cambiar de paciente — el useState de "notas"
      // solo se inicializa en el mount, así que sin esto una
      // reconciliación de React entre dos pacientes distintos (misma
      // posición en el árbol) podría dejar ver/editar las notas del
      // paciente anterior.
      key={paciente.id}
      pacienteId={paciente.id}
      mediciones={mediciones ?? []}
      turnos={(turnos ?? []).map((t) => ({
        id: t.id,
        fechaHora: t.fecha_hora,
        tipo: t.tipo as "presencial" | "videollamada",
        estado: t.estado as "pendiente" | "confirmado" | "en_curso" | "cancelado",
      }))}
      notasIniciales={paciente.notas_generales}
    />
  );

  const laboratoriosContent = (
    <div className="flex flex-col gap-3">
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
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
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
                  <p className="text-sm text-muted-foreground">{lab.notas_profesional}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const planContent = (
    <PlanIAPanel
      // Fuerza remount cuando cambia la identidad del plan activo — sin
      // esto PlanIAPanel reusa la instancia y el useState local de
      // `contenido` queda con el valor inicial.
      key={planActivo?.id ?? "sin-plan"}
      pacienteId={paciente.id}
      planActivo={planActivo}
      planesEnviados={planesEnviados}
      plantillaPlanDefault={preferenciasPlan?.plantilla_plan_alimentario ?? ""}
    />
  );

  const completitudContent = invitacion && linkInvitacion && (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="font-heading text-[27px] tracking-[-.015em] tabular-nums text-primary">
            {porcentajeCompletitud}%
          </span>
          <span className="text-sm text-muted-foreground">
            {seccionesPendientes.length === 0
              ? "Perfil completo."
              : `Falta ${seccionesPendientes.length} de ${SECCIONES_PERFIL.length} secciones. Lo que respondió ya está en la ficha.`}
          </span>
        </div>
        <div className="mb-4 flex gap-1">
          {seccionesCompletitud.map((s) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${s.completadoAt ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="flex flex-col divide-y divide-border">
          {seccionesCompletitud.map((s) => (
            <div
              key={s.key}
              className={`flex items-center justify-between gap-3 py-3 ${
                !s.completadoAt ? "border-l-2 border-l-destructive pl-3" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                    s.completadoAt ? "bg-primary text-primary-foreground" : "border border-input"
                  }`}
                >
                  {s.completadoAt && <Check className="size-3" />}
                </span>
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.completadoAt ? formatoFechaCorta(s.completadoAt) : s.detalle}
                  </p>
                </div>
              </div>
              {!s.completadoAt && (
                <PedirSeccionButton
                  token={invitacion.token}
                  telefono={paciente.telefono}
                  link={linkInvitacion}
                  texto={`Hola ${paciente.nombre}! Nos falta ${s.label.toLowerCase()} para completar tu perfil en NutrIA:`}
                  label="Pedir"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {seccionesPendientes.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
              PEDIR LO QUE FALTA
            </p>
            <p className="mb-3 text-sm text-muted-foreground">
              El link abre directo en lo que falta. No vuelve a preguntar lo que ya respondió.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {seccionesPendientes.map((s) => (
                <Badge key={s.key} variant="outline">
                  {s.label}
                </Badge>
              ))}
            </div>
            <PedirSeccionButton
              token={invitacion.token}
              telefono={paciente.telefono}
              link={linkInvitacion}
              texto={`Hola ${paciente.nombre}! Te dejo el link para terminar de completar tu perfil en NutrIA:`}
              label="Reenviar solo lo pendiente"
              variant="default"
            />
          </div>
        )}

        {eventosInvitacion && eventosInvitacion.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
              ACTIVIDAD DEL LINK
            </p>
            <ul className="flex flex-col gap-2.5">
              {eventosInvitacion.map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {e.tipo === "seccion_completada"
                      ? `Completó ${(SECCION_LABEL[e.seccion ?? ""] ?? e.seccion)?.toLowerCase()}`
                      : (EVENTO_DESCRIPCION[e.tipo] ?? e.tipo)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatoFechaCorta(e.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="border-b border-border bg-card px-10 pt-4">
        <div className="pb-1.5 text-[12.5px] text-muted-foreground">
          <Link href="/app/pacientes" className="hover:text-primary">
            Pacientes
          </Link>{" "}
          <span className="text-[#C8BFC9]">/</span>{" "}
          <span className="text-foreground">{paciente.nombre}</span>
        </div>

        <div className="flex flex-wrap items-start gap-x-7 gap-y-4 pb-3.5">
          <div className="min-w-0 flex-1 basis-[380px]">
            <h1 className="font-heading text-[29px] leading-[1.12] tracking-[-.01em]">
              {paciente.nombre}
            </h1>
            <p className="pt-1.5 text-[13.5px] leading-[1.5] tabular-nums text-muted-foreground">
              {edad !== null && <>{edad} años</>}
              {datosContacto && (
                <>
                  {edad !== null && <span className="px-1.5 text-[#C8BFC9]">·</span>}
                  {datosContacto}
                </>
              )}
              {proximoTurno && (
                <>
                  <span className="px-1.5 text-[#C8BFC9]">|</span>
                  próximo turno{" "}
                  {new Date(proximoTurno.fecha_hora).toLocaleString("es-AR", {
                    weekday: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
              {paciente.estado !== "activo" && (
                <>
                  <span className="px-1.5 text-[#C8BFC9]">|</span>
                  archivado
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/app/chats?paciente=${paciente.id}`} />}
              className="gap-1.5"
            >
              <MessageSquare className="size-3.5" />
              Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/app/agenda?paciente=${paciente.id}`} />}
              className="gap-1.5"
            >
              <CalendarPlus className="size-3.5" />
              Nuevo turno
            </Button>
          </div>
        </div>
      </div>

      <div className="px-10 pt-6 pb-16">
        <div className="max-w-[900px]">
          <FichaTabs
            historia={historiaContent}
            laboratorios={laboratoriosContent}
            plan={planContent}
            completitud={completitudContent}
          />
        </div>
      </div>
    </div>
  );
}
