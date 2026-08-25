import { test, expect } from "@playwright/test";

// Le parcours complet (téléphone -> identité -> sécurité -> succès) ne
// nécessite pas de backend : checkPhone() bascule sur `isUiPreview`
// (import.meta.dev) et simule une réponse "not_found" sans appel réseau.
// Ce test tourne donc contre `npm run dev` (voir playwright.config.ts), pas
// contre le vrai monolithe elm-monolithe.

test.describe("Inscription", () => {
  test("parcours complet jusqu'à la création de compte", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    // Étape 1 : téléphone
    await expect(page.getByRole("heading", { name: "Votre numéro de téléphone" })).toBeVisible();
    await page.getByLabel("Numéro de téléphone").fill("601020304");
    await page.getByRole("button", { name: "Continuer" }).click();

    // Étape 2 : identité. "Nom" en exact:true : sinon getByLabel("Nom") matche
    // aussi "Prénom", qui contient littéralement "nom" comme sous-chaîne.
    // Timeout généreux : première visite de /inscription dans la suite,
    // donc premier compile à la volée de cette route par Vite (dev only).
    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Prénom").fill("Moussa");
    await page.getByLabel("Nom", { exact: true }).fill("Camara");
    await page.getByRole("button", { name: "Continuer" }).click();

    // Étape 3 : sécurité
    await page.getByPlaceholder("Votre mot de passe").fill("Passw0rd!2024");
    await page.getByPlaceholder("Répétez le mot de passe").fill("Passw0rd!2024");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Succès
    await expect(page.getByRole("heading", { name: "Compte créé" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("bloque l'étape identité si le prénom est vide", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);
    await page.getByLabel("Numéro de téléphone").fill("601020304");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});
