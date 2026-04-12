export const metadata = { title: "Budgets — Watchman Finance" };

export default function Page() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="wf-page-title">Budgets</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Module: Budgeting & Forecasting &mdash; Pack 010
        </p>
      </div>
      <div className="wf-card border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-amber-300 font-medium mb-1">Not yet active</p>
        <p className="text-sm text-neutral-400">
          This module will be available after the required migration pack is applied
          and seeded. Build this screen in the sprint for Budgeting & Forecasting.
        </p>
      </div>
    </div>
  );
}
