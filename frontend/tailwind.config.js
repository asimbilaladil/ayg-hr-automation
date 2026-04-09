/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef7ee',
          100: '#fdeed7',
          200: '#fbd9ae',
          300: '#f8be7a',
          400: '#f49944',
          500: '#f17c1e',
          600: '#e26114',
          700: '#bb4912',
          800: '#953a16',
          900: '#793115',
          950: '#411709',
        }
      }
    }
  },
  plugins: []
}
