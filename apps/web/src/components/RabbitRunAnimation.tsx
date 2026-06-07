'use client'

type Props = {
  percent: number
  label: string
  timeLeft?: number
  animate?: boolean
}

function RabbitSvg() {
  return (
    <svg width="52" height="44" viewBox="0 0 52 44" fill="none" aria-hidden>
      <ellipse cx="26" cy="28" rx="14" ry="11" fill="#FF6B35" />
      <circle cx="38" cy="30" r="4" fill="#FF6B35" />
      <ellipse cx="14" cy="18" rx="4" ry="11" fill="#FF6B35" />
      <ellipse cx="22" cy="16" rx="4" ry="12" fill="#FF6B35" />
      <circle cx="30" cy="26" r="2" fill="#fff" />
      <circle cx="31" cy="25.5" r="0.8" fill="#1a1a1a" />
      <ellipse cx="34" cy="28" rx="2" ry="1.2" fill="#FFB088" />
    </svg>
  )
}

function CarrotSvg() {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden>
      <path d="M14 4C10 10 6 18 6 26C6 30 9 33 14 33C19 33 22 30 22 26C22 18 18 10 14 4Z" fill="#FF6B35" />
      <path d="M10 6L14 2L18 6" stroke="#2D8A4E" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 2V8" stroke="#2D8A4E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function RabbitRunAnimation({ percent, label, timeLeft, animate = true }: Props) {
  const clamped = Math.min(100, Math.max(0, percent))
  const rabbitLeft = `calc(${clamped}% - 26px)`

  return (
    <div className="w-full px-2">
      <div className="relative mb-2 h-12">
        <div
          className={`absolute top-2 z-10 will-change-[left] ${animate ? 'rabbit-bounce' : ''}`}
          style={{ left: rabbitLeft, transition: animate ? 'left 0.6s ease-out' : 'left 0.3s ease' }}
        >
          <RabbitSvg />
        </div>
        <div className="absolute right-0 top-3">
          <CarrotSvg />
        </div>
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-[#F0F0F0]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF8C61] via-[#FF6B35] to-[#E04E1B] transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-sm">
          {Math.round(clamped)}%
        </span>
      </div>

      <p className="mt-3 text-center text-sm font-bold text-[#FF6B35]">{label}</p>
      {timeLeft != null && timeLeft > 0 && (
        <p className="mt-1 text-center text-xs font-semibold text-gray-500">
          Delivering in {timeLeft} mins
        </p>
      )}
    </div>
  )
}
