import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client: persists session in cookies so middleware and
 * Server Components see the same session as the client (see @supabase/ssr).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
