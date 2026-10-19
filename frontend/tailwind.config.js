/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-normal': 'spin 1.5s linear infinite',
        'spin-fast': 'spin 0.6s linear infinite',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'emergency-flash': 'emergencyFlash 1s ease-in-out infinite',
      },
      keyframes: {
        emergencyFlash: {
          '0%, 100%': { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
          '50%': { backgroundColor: '#fecaca', borderColor: '#b91c1c' },
        }
      }
    },
  },
  plugins: [],
}
