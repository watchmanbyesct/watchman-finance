import type { ReactNode } from "react";

type Row = Record<string, unknown>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function WorkflowDataTable({
  columns,
  rows,
  emptyMessage = "No rows yet.",
}: {
  columns: { key: string; label: string; render?: (row: Row) => ReactNode }[];
  rows: Row[];
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-left text-sm text-neutral-300">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.06] last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top whitespace-nowrap max-w-[14rem] truncate">
                  {c.render ? c.render(row) : cell(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
