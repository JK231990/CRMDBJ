/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        swiss: {
          red: '#D52B1E',
          'red-dark': '#B82317',
          'red-light': '#E8483E',
          'red-50': '#FDF2F1',
          'red-100': '#FAE3E1',
        },
        ink: {
          DEFAULT: '#111111',
          secondary: '#555555',
          muted: '#888888',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#F7F7F7',
          'light-alt': '#FAFAFA',
          border: '#E5E5E5',
          'border-dark': '#D0D0D0',
        },
        success: '#1F8A4C',
        'success-light': '#E8F5EC',
        warning: '#D97706',
        'warning-light': '#FEF3E2',
        error: '#C62828',
        'error-light': '#FDE8E8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '10px',
        '2xl': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.08), 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 40px 0 rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
