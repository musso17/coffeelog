/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#edfdf5',
          100: '#d1fbe4',
          200: '#a3f5ca',
          300: '#6be9ab',
          400: '#3bdb90',
          500: '#12c877',
          600: '#02a965',
          700: '#018656',
          800: '#016846',
          900: '#004031',
        },
        surface: {
          950: '#050708',
          900: '#0b1115',
          800: '#10171d',
          700: '#19222b',
        },
        muted: {
          500: '#7b8b99',
          400: '#94a3af',
          300: '#b6c2cc',
        },
      },
    },
  },
  plugins: [],
};
