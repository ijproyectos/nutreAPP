import { getAuthorizedPaciente } from "@/lib/dal";

// Todo lo que cuelga de /portal requiere una fila en `pacientes` con
// user_id ya vinculado (vía aceptar_invitacion) — si el usuario logueado es
// un profesional o todavía no aceptó ninguna invitación, esta guard
// redirige antes de que se renderice nada. Ver src/lib/dal.ts.
export default async function PortalLayout({
  children,
}: LayoutProps<"/portal">) {
  await getAuthorizedPaciente();

  return <div className="flex min-h-screen flex-col">{children}</div>;
}
