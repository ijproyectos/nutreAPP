import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-primary">
          No se pudo iniciar sesión
        </h1>
        <p className="text-sm text-muted-foreground">
          Hubo un problema al completar el inicio de sesión con Google.
          Intentá de nuevo.
        </p>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Reintentar
        </Button>
      </Card>
    </div>
  );
}
