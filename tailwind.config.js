/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
const typography   = require('@tailwindcss/typography');

// Corsam brand identity (from corsam.es): strict monochrome — black for
// primary actions and structure, white surfaces, slate gray for secondary
// text, off-white for soft backgrounds. No gradients, no rounded corners.
const corsam = {
  black: '#0A0A0A',    // primary actions, active nav, headings
  ink: '#212121',      // dense text
  gray: '#5F656F',     // secondary text, kickers (from corsam.es)
  line: '#D7D7D7',     // hairline borders
  paper: '#F5F5F5',    // soft background (from corsam.es)
};

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        corsam,
      },
      fontFamily: {
        // Rubik for headings (corsam.es headings), Open Sans for body.
        sans: ['"Open Sans"', ...defaultTheme.fontFamily.sans],
        display: ['Rubik', '"Open Sans"', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        // Brand uses straight edges; keep inputs slightly softened.
        none: '0',
        sm: '2px',
        DEFAULT: '0',
      },
    },
  },
  plugins: [
    typography,
  ],
};
