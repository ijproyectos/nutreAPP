import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MessageSquare, CalendarPlus } from "lucide-react";
import { getAuthorizedProfesional } from "@/lib/dal";
import { edadDesde, formatoFechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { obtenerDocumentos } from "@/lib/queries/documentos";
import { LaboratorioReviewCard } from "./laboratorio-review-card";
import { PlanIAPanel } from "./plan-ia-panel";
import { ConsultaPanel } from "./consulta-panel";
import { HistoriaTimelinePanel, type EventoHistoria } from "./historia-timeline-panel";
import { ArchivosPanel } from "./archivos-panel";
import { DatosEditablesPanel } from "./datos-editables-panel";
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
  validado: "bg-positive text-positive-foreground border-transparent",
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
      `id, nombre, telefono, email, fecha_nacimiento, estado, notas_generales, created_at,
       dni, obra_social, motivo_consulta, sede, quien_derivo, sexo_biologico,
       condiciones, alergias, medicacion,
       habitos_comidas, habitos_quien_cocina, habitos_movimiento,
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
        .limit(20)
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

  // Tab Consulta ("de qué veníamos") + tab Historia (línea de tiempo).
  const { data: consultas, error: consultasError } = await supabase
    .from("consultas")
    .select("id, fecha, acordado, completo, cambio, created_at")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .limit(60);
  if (consultasError) {
    console.error("[FichaPacientePage] select de consultas falló:", consultasError);
  }

  // Tab Consulta ("qué pasó desde entonces" + grilla de adherencia).
  const { data: registros, error: registrosError } = await supabase
    .from("registros_comida")
    .select("fecha, adherencia")
    .eq("paciente_id", id)
    .order("fecha", { ascending: false })
    .limit(60);
  if (registrosError) {
    console.error("[FichaPacientePage] select de registros_comida falló:", registrosError);
  }

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

  const documentos = await obtenerDocumentos(supabase, id);

  // Tab Consulta ("pendiente de cobro").
  const { data: cobrosPendientes, error: cobrosError } = await supabase
    .from("cobros")
    .select("monto, fecha_vencimiento, created_at")
    .eq("paciente_id", id)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true })
    .limit(1);
  if (cobrosError) {
    console.error("[FichaPacientePage] select de cobros falló:", cobrosError);
  }

  const edad = edadDesde(paciente.fecha_nacimiento);
  const pendientes = (laboratorios ?? []).filter(
    (l) => l.estado === "pendiente_revision"
  );
  const revisados = (laboratorios ?? []).filter(
    (l) => l.estado !== "pendiente_revision"
  );

  const ahora = new Date();
  const hoyISO = ahora.toISOString().slice(0, 10);
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

  // ---------- Tab Consulta ----------
  const consultaHoy = (consultas ?? []).find((c) => c.fecha === hoyISO);
  const consultaAnterior = (consultas ?? [])
    .filter((c) => c.fecha !== hoyISO && c.acordado)
    .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))[0];

  const desde21 = new Date(ahora);
  desde21.setDate(desde21.getDate() - 20);
  const registrosUltimos21 = (registros ?? []).filter(
    (r) => new Date(r.fecha) >= desde21
  );
  const diasDesdeAlta =
    Math.floor((ahora.getTime() - new Date(paciente.created_at).getTime()) / 86_400_000) + 1;
  const registrosEsperados = Math.max(1, Math.min(21, diasDesdeAlta));
  const registrosHechos = new Set(registrosUltimos21.map((r) => r.fecha)).size;

  const registrosPorFecha = new Map(
    registrosUltimos21.map((r) => [r.fecha, !!r.adherencia])
  );
  const adherencia21: boolean[] = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);
    adherencia21.push(!!registrosPorFecha.get(d.toISOString().slice(0, 10)));
  }

  const medicionesAsc = [...(mediciones ?? [])]
    .filter((m) => m.peso !== null)
    .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));
  const ultimaMedicion = medicionesAsc[medicionesAsc.length - 1];
  const hace30 = new Date(ahora);
  hace30.setDate(hace30.getDate() - 30);
  const medicionReferencia =
    medicionesAsc.filter((m) => new Date(m.fecha) <= hace30).slice(-1)[0] ??
    medicionesAsc[0];
  const deltaPesoMes =
    ultimaMedicion && medicionReferencia && medicionReferencia.id !== ultimaMedicion.id
      ? Number((ultimaMedicion.peso! - medicionReferencia.peso!).toFixed(1))
      : null;

  const cobroMasViejo = (cobrosPendientes ?? [])[0];
  const pendienteCobro = cobroMasViejo
    ? {
        monto: Number(cobroMasViejo.monto),
        dias: Math.floor(
          (ahora.getTime() -
            new Date(cobroMasViejo.fecha_vencimiento ?? cobroMasViejo.created_at).getTime()) /
            86_400_000
        ),
        telefono: paciente.telefono,
      }
    : null;

  const consultaContent = (
    <ConsultaPanel
      key={paciente.id}
      pacienteId={paciente.id}
      pacienteNombre={paciente.nombre}
      ultimaConsulta={
        consultaAnterior ? { acordado: consultaAnterior.acordado as string, fecha: consultaAnterior.fecha } : null
      }
      notaHoyInicial={consultaHoy?.acordado ?? ""}
      resumen={{
        registrosHechos,
        registrosEsperados,
        deltaPesoMes,
      }}
      mediciones={mediciones ?? []}
      adherencia21={adherencia21}
      planResumen={{
        existe: !!planActivo || planesEnviados.length > 0,
        estado: planActivo ? planActivo.estado : planesEnviados.length > 0 ? "enviado" : null,
      }}
      pendienteCobro={pendienteCobro}
    />
  );

  // ---------- Tab Historia (línea de tiempo) ----------
  type EventoRaw = { fecha: Date; tipo: EventoHistoria["tipo"]; texto: string };
  const eventosRaw: EventoRaw[] = [];

  for (const c of consultas ?? []) {
    const contenido = [c.acordado, c.completo, c.cambio].filter(Boolean).join(" — ");
    if (!contenido) continue;
    eventosRaw.push({ fecha: new Date(c.fecha), tipo: "Consulta", texto: contenido });
  }
  for (const m of mediciones ?? []) {
    if (m.peso == null) continue;
    eventosRaw.push({ fecha: new Date(m.fecha), tipo: "Medición", texto: `${m.peso} kg registrados.` });
  }
  for (const p of planes ?? []) {
    if (p.enviado_at) {
      eventosRaw.push({ fecha: new Date(p.enviado_at), tipo: "Plan", texto: "Enviaste el plan alimentario." });
    } else {
      eventosRaw.push({
        fecha: new Date(p.created_at),
        tipo: "Plan",
        texto: p.generado_con_ia ? "Generaste un borrador de plan con IA." : "Armaste un borrador de plan.",
      });
    }
  }
  for (const e of eventosInvitacion ?? []) {
    if (e.tipo === "seccion_completada") {
      eventosRaw.push({
        fecha: new Date(e.created_at),
        tipo: "Formulario",
        texto: `Completó ${(SECCION_LABEL[e.seccion ?? ""] ?? e.seccion ?? "").toLowerCase()}.`,
      });
    }
  }
  eventosRaw.push({ fecha: new Date(paciente.created_at), tipo: "Alta", texto: "Se dio de alta." });

  const eventosHistoria: EventoHistoria[] = eventosRaw
    .sort((a, b) => +b.fecha - +a.fecha)
    .map((e) => ({ fecha: e.fecha.toISOString(), tipo: e.tipo, texto: e.texto }));

  const historiaContent = <HistoriaTimelinePanel eventos={eventosHistoria} />;

  // ---------- Tab Archivos ----------
  const fechaUltimoArchivo = [
    ...(laboratorios ?? []).map((l) => l.created_at),
    ...documentos.map((d) => d.createdAt),
  ].sort().slice(-1)[0];

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

  const archivosContent = (
    <ArchivosPanel
      pacienteId={paciente.id}
      pacienteNombre={paciente.nombre}
      ultimaActividad={
        fechaUltimoArchivo ? `Lo último que subió fue el ${formatoFechaCorta(fechaUltimoArchivo)}.` : null
      }
      laboratoriosSection={laboratoriosContent}
      hayLaboratorios={(laboratorios ?? []).length > 0}
      documentos={documentos}
      planesEnviados={planesEnviados.map((p) => ({ id: p.id, enviadoAt: p.enviado_at }))}
    />
  );

  // ---------- Tab Plan alimentario ----------
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

  // ---------- Tab Datos ----------
  const resumenLateral = invitacion && linkInvitacion && (
    <>
      {seccionesPendientes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-20px_rgba(36,28,44,.16)]">
          <div className="border-b border-[#F2EBF0] px-[18px] pt-4 pb-3.5">
            <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
              Pedir lo que falta
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground text-pretty">
              El link abre directo en lo que falta. No vuelve a preguntar lo que ya respondió.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 px-[18px] pt-3.5 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {seccionesPendientes.map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center rounded-[7px] border border-[#E4D5E2] bg-accent px-2.5 py-1 text-[11.5px] font-bold text-primary"
                >
                  {s.label}
                </span>
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
        </div>
      )}

      {eventosInvitacion && eventosInvitacion.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(36,28,44,.04)]">
          <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Actividad del link
          </p>
          <ul className="mt-3 flex flex-col gap-[11px]">
            {eventosInvitacion.slice(0, 8).map((e, i) => (
              <li key={i} className="flex items-baseline gap-2.5 text-[12.5px]">
                <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-[#9CAF88]" />
                <span className="min-w-0 flex-1 text-[#4C4455] text-pretty">
                  {e.tipo === "seccion_completada"
                    ? `Completó ${(SECCION_LABEL[e.seccion ?? ""] ?? e.seccion)?.toLowerCase()}`
                    : (EVENTO_DESCRIPCION[e.tipo] ?? e.tipo)}
                </span>
                <span className="shrink-0 tabular-nums whitespace-nowrap text-muted-foreground">
                  {formatoFechaCorta(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const fechaNacimientoTexto = paciente.fecha_nacimiento
    ? `${formatoFechaCorta(paciente.fecha_nacimiento)}${edad !== null ? ` · ${edad} años` : ""}`
    : null;

  const datosContent = (
    <DatosEditablesPanel
      pacienteId={paciente.id}
      porcentaje={porcentajeCompletitud}
      barra={seccionesCompletitud.map((s) => ({ key: s.key, completo: !!s.completadoAt }))}
      notasGenerales={paciente.notas_generales}
      resumenLateral={resumenLateral}
      secciones={[
        {
          key: "contacto",
          titulo: "Contacto",
          origen: paciente.contacto_completado_at
            ? `Cargado el ${formatoFechaCorta(paciente.contacto_completado_at)}`
            : "Sin completar",
          campos: [
            { label: "Teléfono", valor: paciente.telefono },
            { label: "Email", valor: paciente.email },
            { label: "Obra social", valor: paciente.obra_social },
          ],
          valoresCrudos: {
            telefono: paciente.telefono ?? "",
            email: paciente.email ?? "",
            obra_social: paciente.obra_social ?? "",
          },
        },
        {
          key: "personales",
          titulo: "Datos personales",
          origen: paciente.datos_personales_completado_at
            ? `Cargado el ${formatoFechaCorta(paciente.datos_personales_completado_at)}`
            : "Sin completar",
          campos: [
            { label: "Fecha de nacimiento", valor: fechaNacimientoTexto },
            { label: "Sexo biológico", valor: paciente.sexo_biologico },
            { label: "DNI", valor: paciente.dni },
            { label: "Sede", valor: paciente.sede },
            { label: "Quién lo derivó", valor: paciente.quien_derivo },
            { label: "Motivo de consulta", valor: paciente.motivo_consulta },
          ],
          valoresCrudos: {
            fecha_nacimiento: paciente.fecha_nacimiento ?? "",
            sexo_biologico: paciente.sexo_biologico ?? "",
            dni: paciente.dni ?? "",
            sede: paciente.sede ?? "",
            quien_derivo: paciente.quien_derivo ?? "",
            motivo_consulta: paciente.motivo_consulta ?? "",
          },
        },
        {
          key: "antecedentes",
          titulo: "Antecedentes",
          origen: paciente.antecedentes_completado_at
            ? `Cargado el ${formatoFechaCorta(paciente.antecedentes_completado_at)}`
            : "Sin completar",
          campos: [
            { label: "Condiciones", valor: paciente.condiciones },
            { label: "Alergias", valor: paciente.alergias },
            { label: "Medicación", valor: paciente.medicacion },
          ],
          valoresCrudos: {
            condiciones: paciente.condiciones ?? "",
            alergias: paciente.alergias ?? "",
            medicacion: paciente.medicacion ?? "",
          },
        },
        {
          key: "habitos",
          titulo: "Hábitos",
          origen: paciente.habitos_completado_at
            ? `Cargado el ${formatoFechaCorta(paciente.habitos_completado_at)}`
            : "Sin completar",
          campos: [
            { label: "Comidas por día", valor: paciente.habitos_comidas },
            { label: "Quién cocina", valor: paciente.habitos_quien_cocina },
            { label: "Actividad física", valor: paciente.habitos_movimiento },
          ],
          valoresCrudos: {
            habitos_comidas: paciente.habitos_comidas ?? "",
            habitos_quien_cocina: paciente.habitos_quien_cocina ?? "",
            habitos_movimiento: paciente.habitos_movimiento ?? "",
          },
        },
      ]}
    />
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
        <div className="max-w-[980px]">
          <FichaTabs
            consulta={consultaContent}
            historia={historiaContent}
            archivos={archivosContent}
            plan={planContent}
            datos={datosContent}
          />
        </div>
      </div>
    </div>
  );
}
