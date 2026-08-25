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
        { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180x180.png" },
        // Contenu généré dynamiquement par server/routes/manifest.webmanifest.ts
        // (nom/short_name pilotés par NUXT_PUBLIC_APP_NAME, jamais figés au
        // build) — voir docs/pwa.md.
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "stylesheet", href: "https://fonts.cdnfonts.com/css/lato" },
      ],
      meta: [
        // Couleur de marque ELM déjà utilisée comme --p-primary-hover-color
        // (voir assets/css/main.css) et présente dans public/logo_grand.png.
        { name: "theme-color", content: "#2563eb" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
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
  modules: ["nuxt-icon", "@primevue/nuxt-module", "@nuxt/eslint", "@vite-pwa/nuxt"],
  pwa: {
    // Prompt maîtrisé (voir components/PwaUpdatePrompt.vue) : jamais de
    // rechargement silencieux qui mélangerait un ancien JS avec un nouveau
    // backend, jamais l'inverse non plus.
    registerType: "prompt",
    // Le manifest est servi dynamiquement par
    // server/routes/manifest.webmanifest.ts (même artefact .output réutilisable
    // sur plusieurs environnements Hostinger, voir docs/environment.md) : on
    // désactive la génération statique du module pour éviter un
    // manifest.webmanifest figé au build avec un nom d'environnement erroné.
    manifest: false,
    workbox: {
      // App SSR (pas SPA/SSG) : pas de coquille HTML de secours. Une
      // navigation doit toujours atteindre le serveur Nitro, jamais une page
      // mise en cache — voir docs/pwa.md § politique de cache.
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      // Seuls les assets statiques versionnés du build (JS/CSS/icônes/fonts)
      // sont précachés. Aucune route serveur (/api/*, /manifest.webmanifest,
      // /robots.txt) n'est un fichier de ce dossier : elles ne peuvent donc
      // pas se retrouver précachées par erreur.
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}"],
      runtimeCaching: [
        {
          // Nos propres routes serveur /api/* (proxy Nitro vers Laravel, voir
          // server/api/**) : jamais de cache, quel que soit l'environnement.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
          handler: "NetworkOnly",
        },
        {
          // Tout appel cross-origin, notamment le monolithe Laravel appelé
          // directement depuis le navigateur via NUXT_PUBLIC_API_BASE.
          // L'URL réelle varie par environnement et n'est jamais codée en dur
          // ici (voir AGENTS.md) : on bloque par origine, pas par nom de
          // domaine.
          urlPattern: ({ sameOrigin }) => !sameOrigin,
          handler: "NetworkOnly",
        },
      ],
    },
    // Pas de SW en `nuxt dev` : évite toute interférence avec la suite
    // Playwright existante (voir docs/e2e.md), qui tourne contre `nuxt dev`.
    // La vérification réelle du SW se fait via `npm run build` + `npm run
    // preview` (voir docs/pwa.md).
    devOptions: {
      enabled: false,
    },
  },
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
