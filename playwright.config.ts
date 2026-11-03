import { defineConfig, devices } from "@playwright/test";

// Base E2E volontairement pas encore câblée dans ci.yml (pas de job bloquant
// sur les PR) : sur la machine de dev où cette suite a été écrite, 1-2 tests
// sur 16 sont parfois flaky à cause du compile à la volée de Vite (nuxt dev)
// sous charge — comportement machine-dépendant, pas un bug d'app ni de
// sélecteur (vérifié en isolant l'interaction dans un script direct, qui
// réussit systématiquement). `retries: 1` en CI (plus bas) devrait absorber
// ça sur un runner dédié, mais ça n'a pas encore été confirmé en conditions
// CI réelles avant d'en faire un check obligatoire. Lancer manuellement via
// `npm run test:e2e` pour l'instant.
//
// Cible `nuxt dev` (pas un build). Décision du 26/08/2026 : aucune page de
// l'application réelle ne simule plus une réponse backend en dev
// (isUiPreview supprimé de connexion/inscription/mot-de-passe-oublie, et les
// middlewares auth/guest sont actifs en dev comme partout ailleurs — voir
// docs/environment.md). Ce dépôt n'ayant pas de vrai elm-monolithe garanti en
// CI, un second serveur (tests/e2e/mock-backend.mjs) simule le sous-ensemble
// du contrat Laravel nécessaire à cette suite, et NUXT_MONOLITH_API_BASE
// pointe dessus ci-dessous — le mock vit dans les tests, jamais dans l'app.
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
  webServer: [
    {
      command: "node tests/e2e/mock-backend.mjs",
      url: "http://localhost:8100",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
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
        // Le navigateur n'appelle jamais Laravel directement (architecture
        // BFF, voir docs/environment.md) : cette valeur n'a pas besoin de
        // pointer sur un vrai backend pour les tests, seul
        // NUXT_MONOLITH_API_BASE (utilisé par server/api/*) compte ici.
        NUXT_PUBLIC_API_BASE: "http://localhost:8100",
        NUXT_MONOLITH_API_BASE: "http://localhost:8100",
        NUXT_PUBLIC_ENVIRONMENT: "local",
        // >= 32 caractères imposés par h3 useSession — valeur de test fixe,
        // jamais utilisée hors de ce serveur Playwright éphémère.
        NUXT_AUTH_SESSION_PASSWORD: "e2e-playwright-session-password-not-a-secret-00",
        // Le petit overlay Nuxt DevTools (nuxt.config.ts: devtools.enabled)
        // s'affiche par-dessus la page en dev et peut intercepter des clics
        // Playwright ciblant des éléments proches du bord de la fenêtre.
        NUXT_DEVTOOLS_DISABLE: "true",
      },
    },
  ],
});
