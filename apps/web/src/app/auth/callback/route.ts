import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google redirects here with a `code` after the user approves consent.
// This route only exchanges it for a session — it does NOT decide where the
// user belongs (profesional/paciente/sin rol). That's src/lib/dal.ts's job
// (resolveRole), triggered by whatever page `next` points to (default "/",
// the root resolver). Keeping the role check in one place avoids
// duplicating it here and in the DAL.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
