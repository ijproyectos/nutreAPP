import { getAuthorizedPaciente } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Placeholder — el dashboard real del paciente (RF-080/081/082/083) se
// construye en la próxima etapa, después de confirmar que el login
// end-to-end funciona.
export default async function PortalDashboardPage() {
  const { paciente } = await getAuthorizedPaciente();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-xl">
            Hola, {paciente.nombre} 👋
          </CardTitle>
          <CardDescription>
            Tu cuenta ya está vinculada a tu nutricionista. El resto del
            portal (turnos, plan, registro de comidas, chat) todavía no está
            construido — es el próximo paso.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
