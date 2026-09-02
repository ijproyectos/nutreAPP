import { headers } from "next/headers";
import { getAuthorizedProfesional } from "@/lib/dal";
import { AltaPacienteView } from "./alta-paciente-view";

export default async function NuevoPacientePage() {
  const { profesional } = await getAuthorizedProfesional();
  const headersList = await headers();
  const host = headersList.get("host") ?? "nutriar.netlify.app";
  const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  return (
    <AltaPacienteView
      profesionalNombre={profesional.nombre}
      profesionalConsultorio={profesional.consultorio}
      origin={origin}
    />
  );
}
