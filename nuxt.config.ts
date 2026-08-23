import ElmPreset from "./themes/elm";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
          darkModeSelector: ".elm-client-shell.app-dark",
          cssLayer: false,
        },
      },
    },
  },
});
