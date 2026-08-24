"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";

export type ActionState = { error: string } | null;

const TOKEN_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** RF-011: alta de profesional self-serve — sin allowlist, cualquier cuenta
 *  de Google logueada puede crear su fila de tenant. */
export async function altaProfesional(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await getSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const consultorio = String(formData.get("consultorio") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  const { error } = await supabase.from("profesionales").insert({
    user_id: user.id,
    nombre,
    email: user.email!,
    consultorio,
  });

  if (error) {
    return { error: "No se pudo crear tu perfil. Intentá de nuevo." };
  }

  redirect("/app");
}

/** RF-012: aceptar invitación pegando el link/código a mano — fallback para
 *  cuando el paciente no llegó por el link directo (/onboarding/invitacion/[token]). */
export async function aceptarInvitacionInput(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = String(formData.get("token") ?? "").trim();
  const match = raw.match(TOKEN_RE);

  if (!match) {
    return {
      error:
        "Ese link o código no parece válido. Pegá el link completo que te mandó tu nutricionista.",
    };
  }

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("aceptar_invitacion", {
    p_token: match[0],
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/portal");
}
