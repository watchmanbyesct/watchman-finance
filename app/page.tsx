/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import { HomeRedirectClient } from "./home-redirect-client";

/**
 * `/` is protected by middleware. Authenticated users land here briefly, then route to the dashboard.
 * Unauthenticated users are redirected to `/login` by middleware before this tree runs.
 */
export default function RootPage() {
  return <HomeRedirectClient />;
}
