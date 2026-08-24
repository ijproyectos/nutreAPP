import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/dal";
import { OnboardingChooser } from "./onboarding-chooser";

export default async function OnboardingPage() {
  const resolved = await resolveRole();

  if (resolved.role === "profesional") redirect("/app");
  if (resolved.role === "paciente") redirect("/portal");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <OnboardingChooser userEmail={resolved.user.email ?? ""} />
    </div>
  );
}
