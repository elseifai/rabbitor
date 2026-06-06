import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        rabbit: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 20px rgba(22,163,74,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        marquee: 'marquee 30s linear infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'rabbit-hop': 'rabbitHop 0.45s ease-in-out infinite',
        'speed-dash': 'speedDash 0.5s ease-out infinite',
        'run-bob': 'runBob 0.28s ease-in-out infinite',
        'run-leg-a': 'runLegA 0.28s ease-in-out infinite',
        'run-leg-b': 'runLegB 0.28s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rabbitHop: {
          '0%, 100%': { transform: 'translateY(0) rotate(-8deg) scaleX(1)' },
          '35%': { transform: 'translateY(-10px) rotate(4deg) scaleX(1.05)' },
          '70%': { transform: 'translateY(-3px) rotate(-4deg) scaleX(0.98)' },
        },
        speedDash: {
          '0%': { opacity: '0.8', transform: 'translateX(0) scaleX(1)' },
          '100%': { opacity: '0', transform: 'translateX(-10px) scaleX(0.5)' },
        },
        runBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        runLegA: {
          '0%, 100%': { transform: 'rotate(-38deg)' },
          '50%': { transform: 'rotate(42deg)' },
        },
        runLegB: {
          '0%, 100%': { transform: 'rotate(42deg)' },
          '50%': { transform: 'rotate(-38deg)' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-orange-50',
    'bg-orange-600',
    'text-orange-600',
    'text-orange-700',
    'border-orange-200',
    'border-orange-500',
    'hover:bg-orange-600',
    'hover:bg-orange-700',
    'hover:text-orange-600',
    'shadow-orange-100',
    'shadow-orange-200',
    'from-orange-600',
    'to-red-500',
    'accent-orange-600',
  ],
}

export default config
