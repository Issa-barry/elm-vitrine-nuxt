import type { Page } from "@playwright/test";

// Doit rester synchronisé avec tests/e2e/mock-backend.mjs (TEST_TELEPHONE/
// TEST_PASSWORD) — dupliqué plutôt qu'importé : mock-backend.mjs démarre un
// serveur HTTP dès son import (effet de bord, voir son bas de fichier), ce
// qui entrerait en conflit de port avec l'instance déjà démarrée par
// playwright.config.ts (webServer).
const TEST_TELEPHONE_LOCAL = "601020304"; // sans indicatif : "+224" + ce numéro = TEST_TELEPHONE du mock backend
const TEST_PASSWORD = "MotDePasse123";

// Décision du 26/08/2026 ("aucun bypass d'auth runtime, même en dev") :
// middleware/auth.ts protège réellement /espace-client/* dans tous les
// environnements, y compris `nuxt dev` (voir son commentaire). Toute
// suite E2E qui a besoin d'atteindre ces pages doit donc d'abord établir
// une vraie session via un vrai aller-retour de connexion contre le mock
// backend (tests/e2e/mock-backend.mjs), pas via un bypass de page.
export async function loginAsTestUser(page: Page): Promise<void> {
  // timeout: 30_000, pas la valeur par défaut (30_000 déjà en fait, explicité
  // ici) : ce helper peut être le tout premier hit de /connexion de toute la
  // suite (compile à la volée de Vite, en plus du démarrage concurrent du
  // mock backend, voir playwright.config.ts) — la navigation elle-même, pas
  // seulement l'hydratation ensuite, a été mesurée lente dans ces conditions.
  await page.goto("/connexion", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load");
  // 2000ms, pas 300ms comme tests/e2e/connexion.spec.ts : hydratation Vue
  // mesurée plus lente ici pour la même raison que ci-dessus.
  await page.waitForTimeout(2000);

  await page.getByLabel("Numéro de téléphone").fill(TEST_TELEPHONE_LOCAL);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await page.waitForURL(/\/espace-client$/, { timeout: 20_000 });
}
