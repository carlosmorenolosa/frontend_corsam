/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
const typography   = require('@tailwindcss/typography');   // 👈 nuevo

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Usamos Montserrat como primaria y el stack de Tailwind como fallback.
        sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    typography,     // 👈 aquí registramos el plugin
  ],
};
