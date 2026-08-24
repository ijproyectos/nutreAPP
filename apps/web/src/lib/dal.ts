import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer — the *real* auth check. The proxy (src/proxy.ts) only
 * does an optimistic redirect based on the session cookie; this is the
 * secure check, close to the data, that every Server Component / Route
 * Handler / Server Action under /app or /portal should call before
 * touching business data. RLS is the actual enforcement layer underneath
 * this — these functions exist for correct redirects/UX, not as the
 * security boundary itself.
 *
 * `cache()` memoizes per request so calling this from multiple places
 * during one render only hits the DB once.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
});

type ResolvedRole =
  | {
      role: "profesional";
      profesional: { id: string; nombre: string; consultorio: string | null };
    }
  | {
      role: "paciente";
      paciente: { id: string; nombre: string; profesional_id: string };
    }
  | { role: "sin_rol" };

/**
 * Figures out which of the two tenants a logged-in auth.users row belongs
 * to — a `profesionales` row (self-serve, created on demand at onboarding)
 * or a `pacientes` row with `user_id` set (only after accepting an
 * invitation, see aceptar_invitacion() RPC). Neither means the account
 * authenticated with Google but hasn't picked a path yet — that's not an
 * error, just "send them to /onboarding" (unlike a hardcoded-allowlist
 * project, NutrIA has no wrong answer here: signup is open for
 * profesionales, pacientes just need a valid invitation first).
 */
export const resolveRole = cache(async (): Promise<
  Awaited<ReturnType<typeof getSession>> & ResolvedRole
> => {
  const { supabase, user } = await getSession();

  const [{ data: profesional }, { data: paciente }] = await Promise.all([
    supabase
      .from("profesionales")
      .select("id, nombre, consultorio")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("pacientes")
      .select("id, nombre, profesional_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profesional) {
    return { supabase, user, role: "profesional", profesional };
  }
  if (paciente) {
    return { supabase, user, role: "paciente", paciente };
  }
  return { supabase, user, role: "sin_rol" };
});

/** Guard for everything under /app — redirects away if not a profesional. */
export const getAuthorizedProfesional = cache(async () => {
  const resolved = await resolveRole();
  if (resolved.role === "paciente") redirect("/portal");
  if (resolved.role === "sin_rol") redirect("/onboarding");
  return resolved;
});

/** Guard for everything under /portal — redirects away if not a paciente. */
export const getAuthorizedPaciente = cache(async () => {
  const resolved = await resolveRole();
  if (resolved.role === "profesional") redirect("/app");
  if (resolved.role === "sin_rol") redirect("/onboarding");
  return resolved;
});
