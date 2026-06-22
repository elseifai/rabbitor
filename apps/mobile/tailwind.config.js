/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Rabbitor brand
        brand: {
          DEFAULT: '#FF6B35',
          50: '#FFF3EE',
          100: '#FFE3D5',
          200: '#FFC4AB',
          300: '#FFA078',
          400: '#FF834F',
          500: '#FF6B35',
          600: '#F04E12',
          700: '#C73C0B',
          800: '#9C310F',
          900: '#7E2C11',
        },
        // Semantic
        success: '#0C831F',
        ink: {
          DEFAULT: '#1C1C1C',
          soft: '#3A3A3A',
          muted: '#6B7280',
          faint: '#9CA3AF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',
          sunken: '#F1F5F9',
        },
        line: '#EEF0F2',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
