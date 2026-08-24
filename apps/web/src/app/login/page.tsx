import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const nextParam = searchParams?.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl">
            🥗
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
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
