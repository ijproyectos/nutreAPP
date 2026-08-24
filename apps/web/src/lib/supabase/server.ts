import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers and Server
 * Actions. Must be created fresh on every request — never module-level.
 *
 * Writing cookies from a Server Component render is not supported by
 * Next.js, so `setAll` is wrapped in a try/catch there; when that happens
 * the proxy (src/proxy.ts) is what actually refreshes the session cookie
 * on the response.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — expected, the proxy
            // handles refreshing the session cookie for these requests.
          }
        },
      },
    }
  );
}
