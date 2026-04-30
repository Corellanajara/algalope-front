/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ec',
          100: '#fce8c4',
          500: '#c6882b',
          600: '#a16b1d',
          700: '#7d4f13',
          900: '#3b2607',
        },
        turf: {
          700: '#14532d',
          800: '#0f3a22',
        },
      },
    },
  },
  plugins: [],
};
