/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--fni-canvas)', // Mode-aware FNI canvas
        white: '#FFFFFF',
        brand: {
          navy: '#376F9F',     // Accessible FNI blue
          navyLight: '#4C7FAE',// Soft secondary blue
          gold: '#D9BD7B',     // Champagne gold accent
          goldLight: '#F7F0E1',// Pale gold surface
          grey: 'var(--fni-surface-muted)', // Mode-aware neutral surface
          border: 'var(--fni-border)', // Mode-aware border
          text: 'var(--fni-text)', // Mode-aware primary text
          muted: 'var(--fni-text-muted)', // Mode-aware secondary text
          success: '#23845B',  // Success green
          warning: '#D99A32',  // Warning amber
          error: '#C74646',    // Error red
        },
        navy: {
          50: '#EDF5FC',
          100: '#DCEAF6',
          200: '#C5DBEB',
          300: '#A8C9E3',
          400: '#8BB5DC',
          500: '#6596C5',
          600: '#4C7FAE',
          700: '#376F9F',
          800: '#2D5F8B',
          900: '#244B70',
          950: '#19364F',
        },
        purple: { 50: '#EDF5FC', 100: '#DCEAF6', 500: '#6596C5', 600: '#4C7FAE', 700: '#376F9F', 800: '#2D5F8B', 900: '#19364F' }, // Legacy alias mapped to FNI blue
      gold: {
          50: '#FBF8F0',
          100: '#F7F0E1',
          200: '#E9D9B2', // Pale gold
          300: '#E2CEA0',
          400: '#D9BD7B',
          500: '#D9BD7B', // Champagne gold
          600: '#A88A4D',
          700: '#806226',
          800: '#664D20',
          900: '#4C391A',
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
