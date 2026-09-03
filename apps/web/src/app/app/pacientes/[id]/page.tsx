import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { edadDesde, formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LaboratorioReviewCard } from "./laboratorio-review-card";
import { PlanIAPanel } from "./plan-ia-panel";
import { HistoriaClinicaPanel } from "./historia-clinica-panel";
import { PedirSeccionButton } from "./pedir-seccion-button";
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

      {invitacion && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Completitud del perfil</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-primary">
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
                    className={`h-1.5 flex-1 rounded-full ${
                      s.completadoAt ? "bg-primary" : "bg-muted"
                    }`}
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
                          s.completadoAt
                            ? "bg-primary text-primary-foreground"
                            : "border border-input"
                        }`}
                      >
                        {s.completadoAt && <Check className="size-3" />}
                      </span>
                      <div>
                        <p className="font-medium">{s.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.completadoAt
                            ? formatoFechaCorta(s.completadoAt)
                            : s.detalle}
                        </p>
                      </div>
                    </div>
                    {!s.completadoAt && linkInvitacion && (
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
              {seccionesPendientes.length > 0 && linkInvitacion && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                    PEDIR LO QUE FALTA
                  </p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    El link abre directo en lo que falta. No vuelve a
                    preguntar lo que ya respondió.
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
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
                    ACTIVIDAD DEL LINK
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {eventosInvitacion.map((e, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-foreground" />
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
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historia clínica</h2>
        <HistoriaClinicaPanel
          // Fuerza remount al cambiar de paciente — mismo motivo que el
          // key de PlanIAPanel más abajo: el useState de "notas" solo se
          // inicializa en el mount, así que sin esto una reconciliación
          // de React entre dos pacientes distintos (misma posición en el
          // árbol) podría dejar ver/editar las notas del paciente
          // anterior.
          key={paciente.id}
          pacienteId={paciente.id}
          mediciones={mediciones ?? []}
          turnos={(turnos ?? []).map((t) => ({
            id: t.id,
            fechaHora: t.fecha_hora,
            tipo: t.tipo as "presencial" | "videollamada",
            estado: t.estado as
              | "pendiente"
              | "confirmado"
              | "en_curso"
              | "cancelado",
          }))}
          notasIniciales={paciente.notas_generales}
        />
      </section>

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
          plantillaPlanDefault={preferenciasPlan?.plantilla_plan_alimentario ?? ""}
        />
      </section>
    </div>
  );
}
