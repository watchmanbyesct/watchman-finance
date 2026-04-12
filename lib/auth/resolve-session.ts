import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { redirect } from "next/navigation";

export interface AuthSession {
  userId: string;
  email: string;
}

/**
 * Resolve the current authenticated session.
 * Redirects to /login if no active session is found.
 * Use inside Server Components and Server Actions.
 */
export async function requireAuthSession(): Promise<AuthSession> {
  const supabase = createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
  };
}

/**
 * Returns the session without redirecting.
 * Use when you need to handle unauthenticated state yourself.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return { userId: session.user.id, email: session.user.email ?? "" };
}
