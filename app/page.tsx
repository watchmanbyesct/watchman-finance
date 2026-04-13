import { HomeRedirectClient } from "./home-redirect-client";

/**
 * `/` is protected by middleware. Authenticated users land here briefly, then route to the dashboard.
 * Unauthenticated users are redirected to `/login` by middleware before this tree runs.
 */
export default function RootPage() {
  return <HomeRedirectClient />;
}
