/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Añadimos 'sans' para que sea la fuente por defecto si la quieres usar
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
