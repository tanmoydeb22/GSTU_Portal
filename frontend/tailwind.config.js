/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6ebe8',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        sidebar: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          lighter: '#334155',
        }
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(22,163,74,0.08)',
        'brand-glow': '0 4px 14px rgba(22,163,74,0.25), 0 0 40px rgba(22,163,74,0.08)',
        'brand-glow-sm': '0 2px 8px rgba(22,163,74,0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
        'gradient-brand-dark': 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-right': 'slideRight 0.2s ease-out',
      },
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      }
    },
  },
  plugins: [],
};
