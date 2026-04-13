import Link from "next/link";
import type { ReactNode } from "react";

export function AdminSubpage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-amber-500 hover:text-amber-400">
          ← Administration
        </Link>
        <h1 className="wf-page-title mt-2">{title}</h1>
        {description ? (
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
