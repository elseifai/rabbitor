export function TrackingPageSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-xl animate-pulse bg-[#F8FAFC]">
      <div className="sticky top-0 z-40 border-b border-slate-100 bg-white px-4 py-4">
        <div className="h-5 w-32 rounded-lg bg-slate-200" />
        <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-[#FF6B35]/10 px-4 py-6">
        <div className="mx-auto h-8 w-48 rounded-lg bg-[#FF6B35]/20" />
        <div className="mx-auto mt-2 h-4 w-32 rounded bg-slate-200" />
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex justify-between">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="h-2 w-12 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 h-80 rounded-2xl bg-slate-200" />

      <div className="mx-4 mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  )
}
