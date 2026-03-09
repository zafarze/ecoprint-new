/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0088cc',
          hover: '#0077b3',
          light: '#e6f3f8',
        },
        eco: {
          pink: '#ec4899',
          blue: '#0088cc',
        },
        success: {
          DEFAULT: '#10b981',
          hover: '#059669',
        },
        warning: '#f59e0b',
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
        },
        surface: {
          DEFAULT: '#ffffff',
          light: '#f8fafc',
          muted: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'eco-sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'eco-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'eco-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'eco-xl': '0 20px 25px rgba(0, 0, 0, 0.1)',
      },
      // --- ДОБАВИЛИ АНИМАЦИИ СЮДА ---
      animation: {
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      }
    },
  },
  plugins: [],
}