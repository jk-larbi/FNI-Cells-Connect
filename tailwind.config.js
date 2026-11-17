/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F7FC', // FNI app canvas
        white: '#FFFFFF',
        brand: {
          navy: '#173B8F',     // FNI Telegram-inspired blue
          navyLight: '#39216B',// Deeper FNI blue
          gold: '#D9A72E',     // FNI gold accent
          goldLight: '#F3D987',// Light gold
          grey: '#F5F7FC',     // Light grey
          border: '#E2E7F0',   // Border grey
          text: '#202634',     // Primary text
          muted: '#778092',    // Secondary text
          success: '#23845B',  // Success green
          warning: '#D99A32',  // Warning amber
          error: '#C74646',    // Error red
        },
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#486581',
          500: '#334E68',
          600: '#203D63', // Secondary navy
          700: '#1A3354',
          800: '#173B8F', // FNI royal blue
          900: '#39216B',
          950: '#172F67',
        },
        purple: { 50: '#F5F1FC', 100: '#E9E0F8', 500: '#39216B', 600: '#321C60', 700: '#28164D', 800: '#21133F', 900: '#180E30' },
      gold: {
          50: '#FDFCF7',
          100: '#FAF6ED',
          200: '#E9D9B2', // Light gold
          300: '#DFCA96',
          400: '#D2B777',
          500: '#D9A72E', // FNI gold
          600: '#AB8B42',
          700: '#8A6E30',
          800: '#695221',
          900: '#4A3914',
        },
        slate: {
          50: '#F5F7FA', // Light grey
          100: '#EFF2F6',
          200: '#E3E8EF', // Border grey
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#667085', // Secondary text
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#182230', // Primary text
          950: '#101828',
        },
        emerald: {
          50: '#ECFDF3',
          100: '#D1FADF',
          500: '#23845B', // Success green
          600: '#1F7550',
          700: '#1B6444',
        },
        amber: {
          50: '#FEF0C7',
          100: '#FEE4E2',
          500: '#D99A32', // Warning amber
          600: '#B77F23',
          700: '#936517',
        },
        rose: {
          50: '#FFF5F5',  // Reference alert background tint
          100: '#FEE4E2',
          500: '#C74646', // Error red
          600: '#B33B3B',
          700: '#912018',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(23, 59, 143, 0.05)',
        'card': '0 1px 3px 0 rgba(16, 24, 40, 0.1), 0 1px 2px 0 rgba(16, 24, 40, 0.06)',
        'elevated': '0 4px 6px -2px rgba(16, 24, 40, 0.03), 0 12px 16px -4px rgba(16, 24, 40, 0.08)',
        'floating': '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
      }
    },
  },
  plugins: [],
};
