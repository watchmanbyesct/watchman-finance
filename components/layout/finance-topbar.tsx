"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export function FinanceTopbar() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-white/8 bg-[#0d0d0d] flex-shrink-0 gap-3">
      <Link
        href="/finance/dashboard"
        className="flex-shrink-0 rounded-md border border-white/10 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        aria-label="Watchman Finance home"
      >
        <Image
          src="/branding/watchman-by-esct.png"
          alt="Watchman by ESCT"
          width={32}
          height={32}
          className="h-8 w-8 object-contain bg-black/30"
        />
      </Link>
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
        <div className="flex items-center gap-2 flex-1 rounded-md border border-white/8 bg-white/4 px-3 py-1.5">
          <Search size={13} className="text-neutral-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search Finance…"
            className="bg-transparent text-sm text-neutral-300 placeholder:text-neutral-600
                       focus:outline-none w-full"
          />
          <kbd className="hidden sm:inline text-[9px] text-neutral-600 bg-white/5 border
                          border-white/8 rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          className="relative w-8 h-8 rounded-md flex items-center justify-center
                     text-neutral-400 hover:text-neutral-200 hover:bg-white/5
                     transition-colors"
          aria-label="Notifications"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300
                     transition-colors px-2 py-1.5 rounded-md hover:bg-white/5"
          aria-label="Sign out"
        >
          <LogOut size={13} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
