import ElmPreset from "./themes/elm";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    // Utilisés uniquement par les routes serveur Nuxt qui relaient les
    // inscriptions vers Laravel. Le jeton vitrine ne doit jamais être public.
    monolithApiBase:
      process.env.NUXT_MONOLITH_API_BASE ||
      process.env.NUXT_PUBLIC_API_BASE ||
      "",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "",
    },
  },
  app: {
    head: {
      title: "Eau La Maman",
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
