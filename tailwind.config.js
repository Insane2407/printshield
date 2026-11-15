/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#060A12',
          surface: '#0B1220',
          card: 'rgba(15, 23, 42, 0.75)',
          panel: '#0E1726',
          border: 'rgba(56, 189, 248, 0.2)',
          'border-hover': 'rgba(6, 182, 212, 0.5)',
          glow: '#00F0FF',
          blue: '#0066FF',
          neon: '#00F0FF',
          muted: '#94A3B8',
          accent: '#38BDF8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-blue': '0 0 25px -5px rgba(0, 102, 255, 0.35)',
        'glow-sm': '0 0 10px -2px rgba(6, 182, 212, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(0,102,255,0.05) 100%)',
        'radial-glow': 'radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.15), transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
