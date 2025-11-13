import { tailwindColors } from './src/cleverpixel-design-system/src/tokens/colors.js';
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/cleverpixel-design-system/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
