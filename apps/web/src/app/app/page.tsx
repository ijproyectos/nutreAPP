import { getAuthorizedProfesional } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Placeholder — la Bandeja de hoy real (RF-040/041) se construye en la
// próxima etapa, después de confirmar que el login end-to-end funciona.
export default async function BandejaDeHoyPage() {
  const { profesional } = await getAuthorizedProfesional();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-xl">
            Hola, {profesional.nombre} 👋
          </CardTitle>
          <CardDescription>
            Tu login con Google funciona de punta a punta. La Bandeja de hoy
            (alertas, métricas, agenda) todavía no está construida — es el
            próximo paso.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
