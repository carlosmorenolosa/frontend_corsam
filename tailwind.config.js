/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // CAMBIO: Se reemplaza 'Inter' por 'Montserrat'.
        // Las fuentes por defecto (...defaultTheme.fontFamily.sans) se mantienen como respaldo.
        sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
      }
    },
  },
  plugins: [],
}
