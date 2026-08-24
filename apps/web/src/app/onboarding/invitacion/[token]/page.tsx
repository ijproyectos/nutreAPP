import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/app/login/login-form";

// Link directo de invitación: /onboarding/invitacion/[token]. Si el
// paciente ya tiene sesión, acepta la invitación automáticamente. Si no,
// muestra el login y le pasa el `next` para volver a este mismo link
// después del round trip por Google (ver src/proxy.ts y auth/callback).
export default async function InvitacionPage(
  props: PageProps<"/onboarding/invitacion/[token]">
) {
  const { token } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  const { error } = await supabase.rpc("aceptar_invitacion", {
    p_token: token,
  });

  if (!error) {
    redirect("/portal");
  }

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
          {error.message.includes("email")
            ? "El email de la invitación no coincide con la cuenta de Google que usaste. Iniciá sesión con el email al que te invitaron."
            : "El link puede estar vencido o ya usado. Pedile a tu nutricionista que te reenvíe la invitación."}
        </p>
        <Button render={<Link href="/onboarding" />}>
          Ir a la pantalla de inicio
        </Button>
      </Card>
    </div>
  );
}
