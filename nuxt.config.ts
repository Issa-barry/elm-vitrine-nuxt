import ElmPreset from "./themes/elm";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "stylesheet", href: "https://fonts.cdnfonts.com/css/lato" },
      ],
    },
  },
  css: ["primeicons/primeicons.css", "~/assets/css/main.css"],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: ["nuxt-icon", "@primevue/nuxt-module"],
  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: ElmPreset,
        options: {
          darkModeSelector: ".app-dark",
          cssLayer: false,
        },
      },
    },
  },
});
