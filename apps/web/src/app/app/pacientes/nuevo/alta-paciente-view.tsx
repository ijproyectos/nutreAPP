"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

function whatsappHref(telefono: string, nombre: string, profesionalNombre: string, link: string) {
  const texto = encodeURIComponent(
    `Hola ${nombre || ""}! Soy ${profesionalNombre}. Antes de que nos veamos, contame contacto, antecedentes de salud y hábitos y actividad — son ${Math.round(SEGUNDOS_TOTAL / 60)} minutos y así aprovechamos toda la consulta: ${link}`
  );
  const numero = telefono.replace(/[^\d]/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://api.whatsapp.com/send?text=${texto}`;
}

export function AltaPacienteView({
  profesionalNombre,
  profesionalConsultorio,
  origin,
}: {
  profesionalNombre: string;
  profesionalConsultorio: string | null;
  origin: string;
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

  async function copiarLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(String(v))}
      className="flex flex-col gap-5 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/pacientes"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Pacientes
          </Link>
          <h1 className="text-2xl font-bold text-primary">Alta de paciente</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "cargo-yo"
              ? "Dos campos y la ficha queda creada. El perfil se completa después, desde el link."
              : "Lo que ve el paciente cuando abre el link: 5 pasos, 3 minutos."}
          </p>
        </div>

        <TabsList>
          <TabsTrigger value="cargo-yo">Lo cargo yo</TabsTrigger>
          <TabsTrigger value="llena-paciente">Lo llena el paciente</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="cargo-yo">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            {state.status === "success" ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Paciente creado</h2>
                  <p className="text-sm text-muted-foreground">
                    Mandale este link por WhatsApp — cuando lo abra e inicie
                    sesión con Google, va a quedar vinculado automáticamente
                    y le vamos a pedir el resto del perfil.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2">
                  <code className="flex-1 truncate text-xs">{inviteLink}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={copiarLink}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="gap-1.5"
                    nativeButton={false}
                    render={
                      <a
                        href={whatsappHref(telefono, nombre, profesionalNombre, inviteLink ?? "")}
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
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Nuevo paciente</h2>
                  <p className="text-sm text-muted-foreground">
                    Con el nombre y un contacto ya queda la ficha creada. El
                    resto lo completa el paciente desde el link.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nombre">Nombre y apellido</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Escribí el nombre completo"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Como quieras que aparezca en la ficha.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jonatan@gmail.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Con esta cuenta de Google va a poder entrar al link — el
                    mockup lo combina con teléfono en un solo campo, pero el
                    email sigue siendo obligatorio acá: aceptar_invitacion()
                    valida la invitación matcheando este email contra la
                    cuenta de Google que use el paciente.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telefono">
                    Teléfono <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="11 3880-7642"
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                    AGREGAR AHORA SI YA LO TENÉS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CAMPOS_OPCIONALES.filter((c) => !camposVisibles.has(c.key)).map((c) => (
                      <Button
                        key={c.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCamposVisibles((prev) => new Set(prev).add(c.key))
                        }
                      >
                        + {c.label}
                      </Button>
                    ))}
                  </div>
                  {camposVisibles.size > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {CAMPOS_OPCIONALES.filter((c) => camposVisibles.has(c.key)).map((c) => (
                        <div key={c.key} className="flex flex-col gap-1.5">
                          <Label htmlFor={c.key}>{c.label}</Label>
                          <Input
                            id={c.key}
                            name={c.key}
                            value={camposOpcionalesValores[c.key] ?? ""}
                            onChange={(e) =>
                              setCamposOpcionalesValores((prev) => ({
                                ...prev,
                                [c.key]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {state.status === "error" && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}

                <Button type="submit" disabled={pending} className="w-fit gap-1.5">
                  <Send className="size-4" />
                  {pending ? "Creando…" : "Crear paciente"}
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                QUÉ INCLUYE EL LINK
              </p>
              <p className="mb-3 text-sm">
                Se completa en <strong>{Math.round(SEGUNDOS_TOTAL / 60)} minutos</strong>.
              </p>
              <div className="flex flex-col divide-y divide-border">
                {SECCIONES_LINK.map((s) => (
                  <div key={s.label} className="flex items-start justify-between gap-2 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.detalle}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">{s.segundos}s</span>
                      {s.siempre && (
                        <Badge variant="secondary" className="text-[10px]">
                          Siempre
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                LE LLEGA ESTO
              </p>
              <p className="mb-3 rounded-lg bg-card p-3 text-sm">
                Hola {nombre || "[nombre]"}! Soy {profesionalNombre}. Antes de
                que nos veamos, contame contacto, antecedentes de salud y
                hábitos y actividad — son {Math.round(SEGUNDOS_TOTAL / 60)}{" "}
                minutos y así aprovechamos toda la consulta.
              </p>
              <p className="truncate text-xs text-primary underline">
                {inviteLink ?? "Se genera al crear el paciente"}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="llena-paciente">
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Vista previa, no editable — así arranca el wizard que el paciente
            ve al abrir su link.
          </p>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {profesionalNombre
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{profesionalNombre}</p>
                {profesionalConsultorio && (
                  <p className="text-xs text-muted-foreground">{profesionalConsultorio}</p>
                )}
              </div>
              <Sparkles className="ml-auto size-4 text-muted-foreground" />
            </div>
            <div className="mb-4 flex gap-1">
              <div className="h-1 flex-1 rounded-full bg-primary/60" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1 flex-1 rounded-full bg-muted" />
              ))}
            </div>
            <p className="mb-1 text-xs text-muted-foreground">
              Paso 1 de 5 · queda ~{SEGUNDOS_TOTAL}s
            </p>
            <h3 className="mb-1 text-lg font-bold text-primary">Empecemos por lo básico</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Tres cosas y seguimos. Nada de esto se comparte con nadie.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Cómo te llamás</Label>
                <Input value={nombre || "Jonatan Ríos"} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input placeholder="dd / mm / aaaa" disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sexo biológico</Label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg border border-input px-4 py-2 text-center text-sm text-muted-foreground">
                    Femenino
                  </div>
                  <div className="flex-1 rounded-lg border border-input px-4 py-2 text-center text-sm text-muted-foreground">
                    Masculino
                  </div>
                </div>
              </div>
              <Button type="button" disabled>
                Continuar →
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
