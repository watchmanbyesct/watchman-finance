/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

export default function PlatformLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-white/10" />
      <div className="rounded-lg border border-white/10 bg-[#141414] p-6 h-64" />
    </div>
  );
}
