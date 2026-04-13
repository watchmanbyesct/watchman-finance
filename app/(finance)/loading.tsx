export default function FinanceLoading() {
  return (
    <div className="max-w-6xl space-y-8 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-md bg-white/10" />
          <div className="h-4 w-72 rounded bg-white/5" />
        </div>
        <div className="h-7 w-40 rounded-full bg-white/10" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-[#141414] p-5 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-white/10 bg-[#141414] p-5 h-80" />
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-[#141414] p-5 h-48" />
          <div className="rounded-lg border border-amber-500/20 bg-[#141414] p-5 h-40" />
        </div>
      </div>
    </div>
  );
}
