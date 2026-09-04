import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const nextParam = searchParams?.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Mismo lockup que el logo del sidebar (app-shell.tsx) — sin
              emoji, el sistema de diseño lo pide explícito ("sin emojis,
              sin caracteres tipográficos como íconos"). */}
          <div
            className="flex size-14 items-center justify-center rounded-2xl font-heading text-2xl font-semibold text-[#3A2410] shadow-[0_2px_6px_rgba(0,0,0,.18)]"
            style={{ background: "linear-gradient(150deg,#EFBB85,#C4792F)" }}
          >
            N
          </div>
          <h1 className="font-heading text-2xl tracking-tight text-primary">
            NutrIA
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de consultorio para nutricionistas
          </p>
        </div>

        <LoginForm next={next} />

        <p className="text-center text-xs text-muted-foreground">
          Si sos paciente y fuiste invitado, abrí el link que te mandó tu
          nutricionista para continuar.
        </p>
      </Card>
    </div>
  );
}
