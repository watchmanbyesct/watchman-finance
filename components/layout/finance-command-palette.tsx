"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { FINANCE_PALETTE_LINKS } from "@/lib/navigation/finance-palette-links";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FinanceCommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FINANCE_PALETTE_LINKS;
    return FINANCE_PALETTE_LINKS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.group.toLowerCase().includes(q) ||
        (l.keywords ?? "").toLowerCase().includes(q) ||
        l.href.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        go(filtered[active].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, go, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[min(12vh,120px)] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#141414] shadow-2xl shadow-black/60 overflow-hidden wf-palette-panel-in"
      >
        <div className="flex items-center gap-2 border-b border-white/8 px-3">
          <Search size={16} className="text-neutral-500 flex-shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to page…"
            className="flex-1 bg-transparent py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="finance-palette-list"
          />
          <kbd className="text-[10px] text-neutral-500 font-mono tabular-nums">esc</kbd>
        </div>
        <ul
          id="finance-palette-list"
          className="max-h-[min(50vh,360px)] overflow-y-auto py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-neutral-500">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={`${item.href}-${item.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 text-sm transition-colors duration-150 ${
                    i === active
                      ? "bg-amber-500/15 text-amber-100"
                      : "text-neutral-200 hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    {item.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
