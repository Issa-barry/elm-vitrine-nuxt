import ElmPreset from "./themes/elm";
import { runtimeConfigDefaults } from "./config/runtime";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  // Valeurs par défaut uniquement : Nuxt les remplace automatiquement par
  // les variables NUXT_* / NUXT_PUBLIC_* présentes dans l'environnement au
  // démarrage (voir config/runtime.ts et docs/environment.md). Ne jamais
  // coder d'URL métier en dur ici ni ailleurs dans le code applicatif.
  runtimeConfig: runtimeConfigDefaults,
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
  modules: ["nuxt-icon", "@primevue/nuxt-module", "@nuxt/eslint"],
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
