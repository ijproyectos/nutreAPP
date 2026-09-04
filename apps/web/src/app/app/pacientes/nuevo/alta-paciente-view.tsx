"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle, Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { crearPaciente, registrarEnvioWhatsApp, type CrearPacienteState } from "../actions";

const initialState: CrearPacienteState = { status: "idle" };

const CAMPOS_OPCIONALES = [
  { key: "dni", label: "DNI" },
  { key: "obra_social", label: "Obra social" },
  { key: "motivo_consulta", label: "Motivo de consulta" },
  { key: "sede", label: "Sede" },
  { key: "quien_derivo", label: "Quién lo derivó" },
] as const;

const SECCIONES_LINK = [
  { label: "Datos personales", detalle: "Nombre, nacimiento, sexo", segundos: 40, siempre: true },
  { label: "Contacto", detalle: "Teléfono, email, canal", segundos: 30, siempre: false },
  { label: "Antecedentes de salud", detalle: "Condiciones, alergias, medicación", segundos: 50, siempre: false },
  { label: "Hábitos y actividad", detalle: "Comidas, quién cocina, movimiento", segundos: 50, siempre: false },
  { label: "Consentimiento", detalle: "Uso de datos clínicos", segundos: 10, siempre: true },
];

const SEGUNDOS_TOTAL = SECCIONES_LINK.reduce((sum, s) => sum + s.segundos, 0);

/** Texto base — usado por whatsappHref/el preview "Le llega esto" salvo
 * que el profesional haya cargado una plantilla propia en Configuración
 * → Comunicación (`profesionales.plantilla_invitacion_whatsapp`,
 * placeholders `{nombre}`/`{profesional}`). */
function textoInvitacion(
  nombre: string,
  profesionalNombre: string,
  plantilla: string | null | undefined
) {
  if (plantilla) {
    return plantilla
      .replaceAll("{nombre}", nombre || "")
      .replaceAll("{profesional}", profesionalNombre);
  }
  return `Hola ${nombre || ""}! Soy ${profesionalNombre}. Antes de que nos veamos, contame contacto, antecedentes de salud y hábitos y actividad — son ${Math.round(SEGUNDOS_TOTAL / 60)} minutos y así aprovechamos toda la consulta.`;
}

function whatsappHref(telefono: string, texto: string, link: string) {
  const mensaje = encodeURIComponent(`${texto} ${link}`);
  const numero = telefono.replace(/[^\d]/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${mensaje}`
    : `https://api.whatsapp.com/send?text=${mensaje}`;
}

const inputClass =
  "h-[42px] w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]";
const labelClass = "text-xs font-semibold tracking-[.01em] text-[#4C4455]";

export function AltaPacienteView({
  profesionalNombre,
  profesionalConsultorio,
  origin,
  plantillaInvitacion,
}: {
  profesionalNombre: string;
  profesionalConsultorio: string | null;
  origin: string;
  /** Configuración → Comunicación. */
  plantillaInvitacion: string | null;
}) {
  const [tab, setTab] = useState("cargo-yo");
  const [state, formAction, pending] = useActionState(crearPaciente, initialState);
  const [copied, setCopied] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [camposVisibles, setCamposVisibles] = useState<Set<string>>(new Set());
  // Igual que nombre/telefono: todo campo dentro de <form action={fn}>
  // tiene que ser controlado, no defaultValue/no controlado — React 19
  // resetea los campos no controlados al terminar la transición de la
  // action, incluso en un resultado de error (crearPaciente nunca lanza,
  // así que ese reset no se puede esquivar devolviendo un error). Mismo
  // gotcha que ya mordió en el módulo de Agenda, ver CLAUDE.md.
  const [camposOpcionalesValores, setCamposOpcionalesValores] = useState<
    Record<string, string>
  >({});

  const inviteLink =
    state.status === "success" ? `${origin}/onboarding/invitacion/${state.token}` : null;
  const mensajePreview = textoInvitacion(nombre || "[nombre]", profesionalNombre, plantillaInvitacion);

  async function copiarLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="p-[38px] pb-16">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <Link
              href="/app/pacientes"
              className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase hover:text-foreground"
            >
              <ArrowLeft className="size-3" />
              Pacientes
            </Link>
            <h1 className="font-heading text-[31px] leading-[1.15] tracking-[-.01em]">
              Alta de paciente
            </h1>
            <p className="mt-[7px] text-sm text-muted-foreground">
              {tab === "cargo-yo"
                ? "Con el nombre y un contacto ya queda la ficha creada. El resto lo completa el paciente desde el link."
                : "Lo que ve el paciente cuando abre el link: 5 pasos, 3 minutos."}
            </p>
          </div>

          <TabsList className="h-auto gap-0.5 rounded-[10px] border border-border bg-[#F1EAEF] p-[3px]">
            <TabsTrigger
              value="cargo-yo"
              className="rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold data-active:bg-card data-active:text-primary data-active:shadow-none"
            >
              Lo cargo yo
            </TabsTrigger>
            <TabsTrigger
              value="llena-paciente"
              className="rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold data-active:bg-card data-active:text-primary data-active:shadow-none"
            >
              Lo llena el paciente
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cargo-yo">
          <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_330px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-20px_rgba(36,28,44,.16)]">
              {state.status === "success" ? (
                <>
                  <div className="border-b border-[#F2EBF0] px-[22px] pt-[18px] pb-4">
                    <p className="font-heading text-[21px] leading-tight tracking-[-.005em]">
                      Paciente creado
                    </p>
                    <p className="mt-[5px] max-w-[52ch] text-[13px] text-muted-foreground text-pretty">
                      Mandale este link por WhatsApp — cuando lo abra e inicie sesión con
                      Google, va a quedar vinculado automáticamente y le vamos a pedir el
                      resto del perfil.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4 p-[22px]">
                    <div className="rounded-[12px] bg-[#3D2740] p-3.5 text-[#EFE7EE]">
                      <p className="text-[13px] leading-[1.5] text-pretty">{mensajePreview}</p>
                      <div className="mt-2.5 flex min-w-0 items-center gap-2 text-[12.5px] text-[#EFBB85]">
                        <code className="truncate">{inviteLink}</code>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="gap-1.5"
                        nativeButton={false}
                        render={
                          <a
                            href={whatsappHref(telefono, mensajePreview, inviteLink ?? "")}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              if (state.status === "success") {
                                registrarEnvioWhatsApp(state.token);
                              }
                            }}
                          />
                        }
                      >
                        <MessageCircle className="size-4" />
                        Enviar por WhatsApp
                      </Button>
                      <Button type="button" variant="outline" className="gap-1.5" onClick={copiarLink}>
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copied ? "Copiado" : "Copiar link"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/app/pacientes/${state.pacienteId}`} />}
                      >
                        Ver ficha
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => {
                          // useActionState no tiene forma de "resetear" su
                          // estado desde afuera — es intencional acá, no el
                          // gotcha de navegación interna documentado en
                          // CLAUDE.md: no estamos navegando a otra pantalla,
                          // estamos forzando un remount completo de este form
                          // para volver a "idle" después de un alta ya
                          // terminada.
                          window.location.reload();
                        }}
                      >
                        Crear otro paciente
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-[#F2EBF0] px-[22px] pt-[18px] pb-4">
                    <p className="font-heading text-[21px] leading-tight tracking-[-.005em]">
                      Nuevo paciente
                    </p>
                    <p className="mt-[5px] max-w-[52ch] text-[13px] text-muted-foreground text-pretty">
                      Con el nombre y un contacto ya queda la ficha creada. El resto lo
                      completa el paciente desde el link.
                    </p>
                  </div>

                  <form action={formAction} className="flex flex-col gap-[18px] p-[22px]">
                    <div className="flex flex-col gap-[7px]">
                      <label className={labelClass} htmlFor="nombre">
                        Nombre y apellido
                      </label>
                      <input
                        id="nombre"
                        name="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Escribí el nombre completo"
                        required
                        className={inputClass}
                      />
                      <p className="min-h-[17px] text-xs text-muted-foreground">
                        Como quieras que aparezca en la ficha.
                      </p>
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <label className={labelClass} htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jonatan@gmail.com"
                        required
                        className={inputClass}
                      />
                      <p className="min-h-[17px] text-xs text-muted-foreground">
                        Con esta cuenta de Google va a poder entrar al link — el mockup lo
                        combina con teléfono en un solo campo, pero el email sigue siendo
                        obligatorio acá: aceptar_invitacion() valida la invitación
                        matcheando este email contra la cuenta de Google que use el
                        paciente.
                      </p>
                    </div>

                    <div className="flex flex-col gap-[7px]">
                      <label className={labelClass} htmlFor="telefono">
                        Teléfono <span className="font-normal text-muted-foreground">(opcional)</span>
                      </label>
                      <input
                        id="telefono"
                        name="telefono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="11 3880-7642"
                        className={inputClass}
                      />
                    </div>

                    {camposVisibles.size > 0 &&
                      CAMPOS_OPCIONALES.filter((c) => camposVisibles.has(c.key)).map((c) => (
                        <div key={c.key} className="flex flex-col gap-[7px]">
                          <div className="flex items-center justify-between gap-3">
                            <label className={labelClass} htmlFor={c.key}>
                              {c.label}
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setCamposVisibles((prev) => {
                                  const next = new Set(prev);
                                  next.delete(c.key);
                                  return next;
                                })
                              }
                              className="text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Quitar
                            </button>
                          </div>
                          <input
                            id={c.key}
                            name={c.key}
                            value={camposOpcionalesValores[c.key] ?? ""}
                            onChange={(e) =>
                              setCamposOpcionalesValores((prev) => ({
                                ...prev,
                                [c.key]: e.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        </div>
                      ))}

                    <div className="flex flex-col gap-[9px] pt-0.5">
                      <p className="text-[10.5px] font-bold tracking-[.11em] text-muted-foreground uppercase">
                        Agregar ahora si ya lo tenés
                      </p>
                      <div className="flex flex-wrap gap-[7px]">
                        {CAMPOS_OPCIONALES.filter((c) => !camposVisibles.has(c.key)).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() =>
                              setCamposVisibles((prev) => new Set(prev).add(c.key))
                            }
                            className="flex items-center gap-1.5 rounded-[8px] border border-dashed border-input bg-background px-3 py-1.5 text-[12.5px] font-semibold text-[#4C4455] transition-colors hover:border-[#C8BFC9] hover:text-foreground"
                          >
                            <Plus className="size-3.5" strokeWidth={1.7} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {state.status === "error" && (
                      <p className="text-sm text-destructive">{state.error}</p>
                    )}

                    <div className="-mx-[22px] -mb-[22px] mt-1 flex flex-wrap items-center gap-2.5 border-t border-[#F2EBF0] bg-[#FCFAFC] px-[22px] py-4">
                      <Button type="submit" disabled={pending} className="gap-1.5">
                        <Send className="size-4" />
                        {pending ? "Creando…" : "Crear paciente"}
                      </Button>
                      <p className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                        Enter para crear
                      </p>
                    </div>
                  </form>
                </>
              )}
            </section>

            <div className="flex flex-col gap-[18px]">
              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-20px_rgba(36,28,44,.16)]">
                <div className="border-b border-[#F2EBF0] px-[18px] pt-4 pb-3.5">
                  <p className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
                    Qué incluye el link
                  </p>
                  <p className="mt-1.5 text-[13px] text-muted-foreground text-pretty">
                    Se completa en{" "}
                    <strong className="font-semibold text-foreground tabular-nums">
                      {Math.round(SEGUNDOS_TOTAL / 60)} minutos
                    </strong>
                    .
                  </p>
                </div>
                <div>
                  {SECCIONES_LINK.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-[11px] border-b border-[#F2EBF0] px-[18px] py-3 last:border-0"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">
                          {s.label}
                        </span>
                        <span className="mt-px block truncate text-[11.5px] text-muted-foreground">
                          {s.detalle}
                        </span>
                      </span>
                      {s.siempre ? (
                        <span className="shrink-0 rounded-[7px] border border-border bg-secondary px-[7px] py-[3px] text-[10.5px] font-bold text-muted-foreground">
                          Siempre
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                          {s.segundos}s
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-[#3D2740] p-[18px] text-[#EFE7EE]">
                <p className="text-[10.5px] font-bold tracking-[.13em] text-[#C0AEC0] uppercase">
                  Le llega esto
                </p>
                <div className="mt-3 rounded-[12px] border border-white/10 bg-white/[.07] p-3.5 text-[13px] leading-[1.5] text-pretty">
                  {mensajePreview}
                  <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#EFBB85]">
                    <span className="truncate">
                      {inviteLink ?? "Se genera al crear el paciente"}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="llena-paciente">
          <div className="flex flex-col items-center gap-3.5">
            <p className="max-w-md text-center text-[13px] text-muted-foreground">
              Vista previa, no editable — así arranca el wizard que el paciente ve al abrir
              su link.
            </p>
            <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(36,28,44,.04),0_14px_32px_-20px_rgba(36,28,44,.16)]">
              <div className="border-b border-[#F2EBF0] px-[22px] pt-[18px] pb-4">
                <div className="flex items-center gap-[11px]">
                  <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-accent text-[12.5px] font-bold text-primary">
                    {profesionalNombre
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{profesionalNombre}</p>
                    {profesionalConsultorio && (
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {profesionalConsultorio}
                      </p>
                    )}
                  </div>
                  <Sparkles className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-[18px] flex gap-1">
                  <div className="h-1 flex-1 rounded-full bg-primary" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full bg-muted" />
                  ))}
                </div>
                <div className="mt-[9px] flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold text-[#4C4455]">Tus datos</span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                    Paso 1 de 5 · queda ~{SEGUNDOS_TOTAL}s
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-[22px] py-6">
                <div>
                  <p className="font-heading text-[24px] leading-[1.2] tracking-[-.008em] text-pretty">
                    Empecemos por lo básico
                  </p>
                  <p className="mt-[7px] text-[13.5px] leading-[1.5] text-muted-foreground text-pretty">
                    Tres cosas y seguimos. Nada de esto se comparte con nadie.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-[#4C4455]">Cómo te llamás</Label>
                  <Input value={nombre || "Jonatan Ríos"} disabled className="h-11" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-[#4C4455]">Fecha de nacimiento</Label>
                  <Input placeholder="dd / mm / aaaa" disabled className="h-11" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-[#4C4455]">Sexo biológico</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-[10px] border border-input px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
                      Femenino
                    </div>
                    <div className="flex-1 rounded-[10px] border border-input px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
                      Masculino
                    </div>
                  </div>
                </div>
                <Button type="button" disabled className="mt-2 gap-1.5">
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
