import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/resolve-session";

export default async function RootPage() {
  const session = await getAuthSession();
  if (session) {
    redirect("/finance/dashboard");
  } else {
    redirect("/login");
  }
}
