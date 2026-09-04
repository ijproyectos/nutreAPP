import { getAuthorizedProfesional } from "@/lib/dal";
import { obtenerTurnosSinConfirmar } from "@/lib/queries/dashboard";
import { AppShell } from "@/components/app-shell";

// Todo lo que cuelga de /app requiere una fila en `profesionales` — si el
// usuario logueado es un paciente o todavía no eligió un rol, esta guard
// redirige antes de que se renderice nada. Ver src/lib/dal.ts.
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, profesional } = await getAuthorizedProfesional();

  // "Con aviso" del nav de Agenda (rediseño visual) — mismo dato que ya
  // calcula la Bandeja de hoy (turnos pendientes en las próximas 48h),
  // reusado acá para no repetir la query.
  const sinConfirmar = await obtenerTurnosSinConfirmar(supabase);

  return (
    <AppShell profesional={profesional} agendaConAviso={sinConfirmar.length > 0}>
      {children}
    </AppShell>
  );
}
