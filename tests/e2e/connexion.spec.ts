import { test, expect } from "@playwright/test";

// Pas d'appel réseau : connexion.vue documente explicitement "Aucun appel
// réseau pour l'instant [...] la soumission simule une connexion réussie"
// (contrat réel du backend en commentaire, pour le futur branchement). Ce
// test valide donc le comportement frontend actuel, pas une authentification
// réelle contre elm-monolithe.
//
// waitUntil: "domcontentloaded" puis un waitForLoadState("load") séparé :
// la navigation initiale ne doit pas attendre les ressources externes lentes
// (police fonts.cdnfonts.com, drapeaux flagcdn.com) sous peine de timeout,
// mais le clic sur un <button @click> (contrairement à un <NuxtLink>, qui a
// un fallback natif <a href>) exige que l'hydratation Vue soit terminée —
// d'où l'attente explicite de "load" avant toute interaction de formulaire.

test.describe("Connexion", () => {
  test("affiche une erreur de validation si le formulaire est vide", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator(".connexion-error").first()).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("connexion simulée réussie redirige vers /espace-client", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await page.getByLabel("Numéro de téléphone").fill("601020304");
    await page.getByPlaceholder("••••••••").fill("MotDePasse123");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
  });

  test("le lien mot de passe oublié mène à /mot-de-passe-oublie", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page).toHaveURL(/\/mot-de-passe-oublie$/);
  });
});
