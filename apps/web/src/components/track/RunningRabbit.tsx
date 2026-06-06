'use client'

export function RunningRabbit({ running }: { running: boolean }) {
  const runClass = running ? 'rabbit-runner--active' : 'rabbit-runner--idle'

  return (
    <>
      <style>{`
        .rabbit-runner {
          overflow: visible;
        }
        .rabbit-runner--active .rabbit-body {
          animation: rabbit-body-bound 0.32s ease-in-out infinite;
          transform-origin: 36px 28px;
          transform-box: fill-box;
        }
        .rabbit-runner--active .rabbit-ear-back {
          animation: rabbit-ear-flow 0.32s ease-in-out infinite;
          transform-origin: 52px 10px;
          transform-box: fill-box;
        }
        .rabbit-runner--active .rabbit-ear-front {
          animation: rabbit-ear-flow 0.32s ease-in-out infinite 0.05s;
          transform-origin: 56px 8px;
          transform-box: fill-box;
        }
        .rabbit-runner--active .rabbit-hind-leg {
          animation: rabbit-hind-run 0.32s ease-in-out infinite;
          transform-origin: 22px 30px;
          transform-box: fill-box;
        }
        .rabbit-runner--active .rabbit-front-leg {
          animation: rabbit-front-run 0.32s ease-in-out infinite;
          transform-origin: 40px 32px;
          transform-box: fill-box;
        }
        .rabbit-runner--active .rabbit-tail {
          animation: rabbit-tail-wag 0.32s ease-in-out infinite;
          transform-origin: 10px 24px;
          transform-box: fill-box;
        }

        @keyframes rabbit-body-bound {
          0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1); }
          35% { transform: translateY(-5px) rotate(-6deg) scaleX(1.04); }
          65% { transform: translateY(-2px) rotate(-3deg) scaleX(0.98); }
        }
        @keyframes rabbit-ear-flow {
          0%, 100% { transform: rotate(8deg); }
          50% { transform: rotate(22deg); }
        }
        @keyframes rabbit-hind-run {
          0%, 100% { transform: rotate(28deg) translateY(0); }
          50% { transform: rotate(-42deg) translateY(-2px); }
        }
        @keyframes rabbit-front-run {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(32deg); }
        }
        @keyframes rabbit-tail-wag {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(12deg); }
        }
      `}</style>

      <svg
        width="64"
        height="44"
        viewBox="0 0 72 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`rabbit-runner drop-shadow-md ${runClass}`}
        aria-hidden
      >
        {/* Ground shadow */}
        <ellipse
          cx="36"
          cy="44"
          rx="18"
          ry="2.5"
          fill="#0F172A"
          opacity="0.08"
          className={running ? 'animate-[pulse_0.32s_ease-in-out_infinite]' : ''}
        />

        {/* Cotton tail */}
        <g className="rabbit-tail">
          <circle cx="10" cy="22" r="5.5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <circle cx="8" cy="20" r="3" fill="#FFFFFF" />
        </g>

        {/* Hind leg — powerful kick */}
        <g className="rabbit-hind-leg">
          <path
            d="M18 30 C14 32 10 36 8 42 C10 43 14 42 16 38 C18 34 20 32 22 30 Z"
            fill="#F1F5F9"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <ellipse cx="9" cy="42.5" rx="4" ry="2" fill="#E2E8F0" />
        </g>

        {/* Main body */}
        <g className="rabbit-body">
          <path
            d="M14 26 C18 18 30 14 42 16 C50 17 54 22 52 28 C50 34 40 36 30 35 C22 34 16 32 14 26 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M16 28 C20 24 28 22 36 23"
            stroke="#F1F5F9"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Front leg */}
          <g className="rabbit-front-leg">
            <path
              d="M38 32 C36 36 34 40 32 44 C34 44.5 37 43 38 40 C39 37 40 34 41 32 Z"
              fill="#F1F5F9"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <ellipse cx="33" cy="44" rx="3" ry="1.6" fill="#E2E8F0" />
          </g>

          {/* Head */}
          <path
            d="M44 18 C48 14 56 12 60 16 C63 19 62 24 58 26 C54 28 48 27 44 22 Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Ears */}
          <g className="rabbit-ear-back">
            <path
              d="M48 10 C46 2 50 0 54 2 C56 6 54 12 50 14 Z"
              fill="#FFF7ED"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M50 6 C51 4 52 6 51 9" stroke="#FECDD3" strokeWidth="1" fill="none" />
          </g>
          <g className="rabbit-ear-front">
            <path
              d="M54 8 C54 0 58 -1 62 3 C64 7 62 13 58 14 Z"
              fill="#FFF7ED"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M58 5 C59 3 60 5 59 8" stroke="#FECDD3" strokeWidth="1" fill="none" />
          </g>

          {/* Face details */}
          <circle cx="58" cy="19" r="2" fill="#0F172A" />
          <circle cx="58.8" cy="18.2" r="0.6" fill="#FFFFFF" />
          <ellipse cx="62" cy="21.5" rx="1.8" ry="1.2" fill="#FDA4AF" />
          <path
            d="M62 22 C63 22.5 64 22 64.5 21"
            stroke="#FB7185"
            strokeWidth="0.7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 24 C58 25 60 25 62 24"
            stroke="#E2E8F0"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />

          {/* Orange delivery scarf */}
          <path
            d="M46 22 C50 24 54 24 58 22 L57 26 C53 28 49 28 45 26 Z"
            fill="#EA580C"
            opacity="0.9"
          />
        </g>
      </svg>
    </>
  )
}
