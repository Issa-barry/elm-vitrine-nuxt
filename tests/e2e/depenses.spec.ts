import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/depenses.vue branché sur
// GET /v1/mobile/depenses/mine (mock-backend.mjs::TEST_EXPENSES, 5 dépenses :
// 3 validées, 1 soumise, 1 rejetée, réparties sur 2 véhicules).
test.describe("Espace client — dépenses", () => {
  test.describe.configure({ timeout: 90_000 });

  test("affiche les vraies dépenses (pas de mock)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page).toHaveTitle(/Dépenses/);

    const desktop = page.locator(".client-desktop-expenses");
    // Total validé réel : 68 400 (dep-1) + 12 700 (dep-2) + 74 300 (dep-4) = 155 400.
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(155_400)} GNF`)).toBeVisible({ timeout: 10_000 });

    // Les 5 dépenses (tous statuts) apparaissent dans le tableau par défaut.
    await expect(desktop.getByText("Carburant").first()).toBeVisible();
    await expect(desktop.getByText("Entretien")).toBeVisible();
    await expect(desktop.getByText("Autre")).toBeVisible();
  });

  test("filtre par statut réel (Validée/Soumise/Rejetée)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("Entretien")).toBeVisible({ timeout: 10_000 });

    // Sélecteur de statut : 1er des deux Select du bandeau de filtre.
    await desktop.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Validée", exact: true }).click();

    await expect(desktop.getByText("Entretien")).toHaveCount(0); // soumis
    await expect(desktop.getByText("Autre")).toHaveCount(0); // rejeté
    await expect(desktop.getByText("Carburant").first()).toBeVisible();
  });

  test("filtre par véhicule réel", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("Entretien")).toBeVisible({ timeout: 10_000 });

    // Sélecteur de véhicule : 2e des deux Select du bandeau de filtre.
    await desktop.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /ABARRY 2/ }).click();

    // Seules les dépenses de veh-2 (Entretien, Carburant du 18/08) restent.
    await expect(desktop.getByText("Entretien")).toBeVisible();
    await expect(desktop.getByText("Autre")).toHaveCount(0); // dep-5 est sur veh-1
  });
});
