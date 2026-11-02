import { test, expect } from "@playwright/test";

// Le parcours complet (téléphone -> identité -> sécurité -> succès) appelle
// réellement /api/register/client/* (isUiPreview retiré le 26/08/2026) —
// contre le mock backend de tests/e2e/mock-backend.mjs (voir
// playwright.config.ts), pas contre le vrai elm-monolithe.

test.describe("Inscription", () => {
  test("parcours complet jusqu'à la création de compte", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

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
    await page.waitForTimeout(1000);
    await page.getByLabel("Numéro de téléphone").fill("601020304");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("verrouille une identité préremplie complète", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    await page.getByLabel("Numéro de téléphone").fill("601020398");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Informations préremplies depuis nos dossiers.")).toBeVisible();
    await expect(page.getByLabel("Prénom")).toHaveValue("Rayanatou");
    await expect(page.getByLabel("Prénom")).not.toBeEditable();
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("SYLLA");
    await expect(page.getByLabel("Nom", { exact: true })).not.toBeEditable();
  });

  // Régression prod 01/11 : prefill sans prénom ni nom -> champs vides verrouillés,
  // impossible de passer l'étape.
  test("laisse saisir le nom si le préremplissage reçu est vide", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    await page.getByLabel("Numéro de téléphone").fill("601020399");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Informations préremplies depuis nos dossiers.")).toBeHidden();
    await page.getByLabel("Prénom").fill("Moussa");
    await page.getByLabel("Nom", { exact: true }).fill("Sidibe");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByPlaceholder("Votre mot de passe")).toBeVisible();
  });

  test("ne garde pas l'identité préremplie d'un autre numéro après un retour", async ({ page }) => {
    await page.goto("/inscription", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    await page.getByLabel("Numéro de téléphone").fill("601020398");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByLabel("Prénom")).toHaveValue("Rayanatou", { timeout: 10_000 });

    await page.getByRole("button", { name: "Retour" }).click();
    await page.getByLabel("Numéro de téléphone").fill("601020304");
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Comment vous appelez-vous ?" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Prénom")).toHaveValue("");
    await expect(page.getByLabel("Prénom")).toBeEditable();
  });
});
