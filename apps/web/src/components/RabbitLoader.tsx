'use client'

export default function RabbitLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white font-sans">
      <div className="relative flex flex-col items-center space-y-4">
        <div className="relative flex h-16 w-24 items-center justify-center">
          <span className="animate-bounce select-none text-5xl tracking-tighter">🐇</span>
          <div className="absolute bottom-1 right-0 flex gap-1 opacity-60">
            <div className="h-0.5 w-2 animate-ping rounded bg-orange-500 [animation-duration:0.6s]" />
            <div className="h-0.5 w-3 animate-ping rounded bg-slate-300 [animation-duration:0.4s]" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-slate-900">rabbit</p>
          <p className="mt-0.5 animate-pulse text-[10px] font-bold tracking-tight text-orange-500">
            Fetching local stores...
          </p>
        </div>
      </div>
    </div>
  )
}
