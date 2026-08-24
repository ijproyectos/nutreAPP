import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/dal";

// Root resolver: never rendered directly. getSession() (inside resolveRole)
// bounces unauthenticated visitors to /login; from there this is the single
// place that decides where a logged-in user actually belongs.
export default async function RootPage() {
  const resolved = await resolveRole();

  if (resolved.role === "profesional") redirect("/app");
  if (resolved.role === "paciente") redirect("/portal");
  redirect("/onboarding");
}
