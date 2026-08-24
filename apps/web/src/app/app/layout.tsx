import { getAuthorizedProfesional } from "@/lib/dal";

// Todo lo que cuelga de /app requiere una fila en `profesionales` — si el
// usuario logueado es un paciente o todavía no eligió un rol, esta guard
// redirige antes de que se renderice nada. Ver src/lib/dal.ts.
export default async function AppLayout({
  children,
}: LayoutProps<"/app">) {
  await getAuthorizedProfesional();

  return <div className="flex min-h-screen flex-col">{children}</div>;
}
