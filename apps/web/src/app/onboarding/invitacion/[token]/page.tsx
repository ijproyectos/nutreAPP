import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/app/login/login-form";
import { PerfilWizard } from "./perfil-wizard";
import type { Seccion } from "./wizard-actions";

// Link directo de invitación: /onboarding/invitacion/[token]. Si el
// paciente ya tiene sesión, acepta la invitación automáticamente (o
// confirma que ya la aceptó — ver 010_aceptar_invitacion_idempotente.sql,
// necesario porque este mismo link se reabre para completar secciones
// pendientes del wizard de perfil, no es de un solo uso). Si no, muestra
// el login y le pasa el `next` para volver a este mismo link después del
// round trip por Google (ver src/proxy.ts y auth/callback).
export default async function InvitacionPage(
  props: PageProps<"/onboarding/invitacion/[token]">
) {
  const { token } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // "Abrió el link" (mockup "Actividad del link") — se loguea acá, antes
    // del login, porque es el momento real de apertura. Nunca lanza: si
    // el token es inválido, el error de esta llamada se ignora en
    // silencio y el paciente igual ve la pantalla de login (el error real
    // de token inválido aparece más abajo, después de loguearse).
    await supabase.rpc("registrar_evento_invitacion", {
      p_token: token,
      p_tipo: "abierto",
    });

    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
        <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl">
            🥗
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-primary">
              Te invitaron a NutrIA
            </h1>
            <p className="text-sm text-muted-foreground">
              Iniciá sesión con la misma cuenta de Google donde recibiste la
              invitación para continuar.
            </p>
          </div>
          <LoginForm next={`/onboarding/invitacion/${token}`} />
        </Card>
      </div>
    );
  }

  const { data: pacienteId, error } = await supabase.rpc(
    "aceptar_invitacion",
    { p_token: token }
  );

  if (error || !pacienteId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
        <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-primary">
            No pudimos vincular tu invitación
          </h1>
          <p className="text-sm text-muted-foreground">
            {error?.message.includes("email")
              ? "El email de la invitación no coincide con la cuenta de Google que usaste. Iniciá sesión con el email al que te invitaron."
              : "El link puede estar vencido o ya usado. Pedile a tu nutricionista que te reenvíe la invitación."}
          </p>
          <Button nativeButton={false} render={<Link href="/onboarding" />}>
            Ir a la pantalla de inicio
          </Button>
        </Card>
      </div>
    );
  }

  // RF-020, wizard de perfil (mockup "Lo llena el paciente"): completitud
  // se calcula acá, no en el cliente — cada *_completado_at nulo es una
  // sección pendiente. El orden es fijo, no el de completado.
  const { data: paciente } = await supabase
    .from("pacientes")
    .select(
      `nombre, fecha_nacimiento, sexo_biologico, telefono,
       condiciones, alergias, medicacion,
       habitos_comidas, habitos_quien_cocina, habitos_movimiento,
       consentimiento_datos,
       datos_personales_completado_at, contacto_completado_at,
       antecedentes_completado_at, habitos_completado_at,
       consentimiento_completado_at,
       profesionales(nombre)`
    )
    .eq("id", pacienteId)
    .maybeSingle();

  if (!paciente) {
    redirect("/portal");
  }

  const seccionesPendientes: Seccion[] = [
    !paciente.datos_personales_completado_at && ("datos_personales" as const),
    !paciente.contacto_completado_at && ("contacto" as const),
    !paciente.antecedentes_completado_at && ("antecedentes" as const),
    !paciente.habitos_completado_at && ("habitos" as const),
    !paciente.consentimiento_completado_at && ("consentimiento" as const),
  ].filter((s): s is Seccion => s !== false);

  if (seccionesPendientes.length === 0) {
    redirect("/portal");
  }

  const profesional = paciente.profesionales as unknown as {
    nombre: string;
  } | null;

  return (
    <PerfilWizard
      seccionesPendientes={seccionesPendientes}
      profesionalNombre={profesional?.nombre ?? "tu nutricionista"}
      valoresIniciales={{
        nombre: paciente.nombre ?? "",
        fecha_nacimiento: paciente.fecha_nacimiento ?? "",
        sexo_biologico:
          (paciente.sexo_biologico as "femenino" | "masculino" | null) ?? "",
        telefono: paciente.telefono ?? "",
        condiciones: paciente.condiciones ?? "",
        alergias: paciente.alergias ?? "",
        medicacion: paciente.medicacion ?? "",
        habitos_comidas: paciente.habitos_comidas ?? "",
        habitos_quien_cocina: paciente.habitos_quien_cocina ?? "",
        habitos_movimiento: paciente.habitos_movimiento ?? "",
        consentimiento_datos: paciente.consentimiento_datos ?? false,
      }}
    />
  );
}
