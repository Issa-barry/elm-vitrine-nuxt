import defaultTheme from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";
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
  plugins: [typography, PrimeUI],
};
