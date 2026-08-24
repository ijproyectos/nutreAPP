import { getAuthorizedProfesional } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";

// Todo lo que cuelga de /app requiere una fila en `profesionales` — si el
// usuario logueado es un paciente o todavía no eligió un rol, esta guard
// redirige antes de que se renderice nada. Ver src/lib/dal.ts.
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { profesional } = await getAuthorizedProfesional();

  return <AppShell profesional={profesional}>{children}</AppShell>;
}
