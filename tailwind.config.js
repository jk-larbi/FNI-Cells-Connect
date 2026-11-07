/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EDF2F8',
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#627D98',
          500: '#334E68',
          600: '#243B53',
          700: '#102A43',
          800: '#0B1B3D',
          900: '#071228',
          950: '#040A17',
        },
        gold: {
          50: '#FCF9EE',
          100: '#F7F0D4',
          200: '#EEDDA3',
          300: '#E4C76D',
          400: '#D7AE3D',
          500: '#C59B27',
          600: '#A67E1B',
          700: '#835F16',
          800: '#644714',
          900: '#463110',
        },
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(11, 27, 61, 0.04), 0 1px 2px 0 rgba(11, 27, 61, 0.02)',
        'card': '0 4px 14px 0 rgba(11, 27, 61, 0.05)',
        'elevated': '0 16px 36px -4px rgba(11, 27, 61, 0.07), 0 6px 14px -2px rgba(11, 27, 61, 0.03)',
        'floating': '0 25px 50px -12px rgba(11, 27, 61, 0.12)',
      }
    },
  },
  plugins: [],
};
