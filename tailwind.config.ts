import defaultTheme from "tailwindcss/defaultTheme";
import PrimeUI from "tailwindcss-primeui";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[class~="app-dark"]'],
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), PrimeUI],
};
