import { defineConfig, devices } from "@playwright/test";

// Cible `nuxt dev` (pas un build) : plusieurs pages (inscription,
// mot-de-passe-oublie) ont un mode `isUiPreview = import.meta.dev` qui
// simule les réponses backend sans appel réseau réel — indispensable ici
// puisque ce dépôt n'a pas de backend Laravel à disposition en CI. Ces
// parcours ne sont donc pas des E2E "bout en bout" contre le vrai
// monolithe (voir docs/environment.md) mais valident le comportement
// frontend (navigation, rendu, validation) de façon fiable et rapide.
export default defineConfig({
  testDir: "./tests/e2e",
  // Un seul worker partout : ces tests partagent un unique serveur `nuxt
  // dev`, et plusieurs onglets visitant des routes différentes pour la
  // première fois en parallèle mettent en file la compilation à la volée
  // de Vite — sur une machine chargée, ça dépasse le timeout par test.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3300",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3300",
    url: "http://localhost:3300",
    // false partout : un serveur "réutilisé" laissé par une exécution
    // précédente sur cette machine s'est révélé être la cause d'échecs
    // intermittents difficiles à diagnostiquer (clics sans effet, alors que
    // la page fonctionne normalement sur un serveur fraîchement démarré).
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NUXT_PUBLIC_SITE_URL: "http://localhost:3300",
      NUXT_PUBLIC_API_BASE: "http://localhost:8000",
      NUXT_PUBLIC_ENVIRONMENT: "local",
      // Le petit overlay Nuxt DevTools (nuxt.config.ts: devtools.enabled)
      // s'affiche par-dessus la page en dev et peut intercepter des clics
      // Playwright ciblant des éléments proches du bord de la fenêtre.
      NUXT_DEVTOOLS_DISABLE: "true",
    },
  },
});
