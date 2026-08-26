import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/activite.vue branché sur GET /v1/mobile/activite
// (mock-backend.mjs::TEST_ACTIVITY, 4 opérations : 2 vente, 2 logistique,
// réparties sur 2 véhicules) — jamais les anciens champs mockés sans
// équivalent backend (driverPhone, agence, créateur, détail produit/quantité,
// heure, montant total), voir le commentaire de suppression dans
// pages/espace-client/activite.vue.
test.describe("Espace client — activité", () => {
  test.describe.configure({ timeout: 90_000 });

  test("affiche les vraies opérations (ventes et logistique mélangées)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page).toHaveTitle(/Activité/);

    const table = page.locator(".client-desktop-deliveries");
    await expect(table.getByText("CMD-2847")).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText("CMD-2839")).toBeVisible();
    await expect(table.getByText("TR-00042-XYZ")).toBeVisible();
    await expect(table.getByText("TR-00038-ABC")).toBeVisible();

    // Jamais les anciens champs de démonstration sans équivalent réel.
    await expect(page.getByText("Mamadou Camara")).toHaveCount(0);
    await expect(page.getByText("Agence principale")).toHaveCount(0);
  });

  test("filtre par type (vente/logistique)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const table = page.locator(".client-desktop-deliveries");
    await expect(table.getByText("CMD-2847")).toBeVisible({ timeout: 10_000 });

    await table.getByRole("button", { name: "Filtres" }).click();
    // getByRole("combobox"), pas getByLabel : le PrimeVue Select ne rend pas
    // d'élément "labelable" natif sous le <label> englobant (span + div),
    // donc getByLabel ne lui associe pas de nom accessible (même raison que
    // tests/e2e/depenses.spec.ts). 1er des deux Select du formulaire = Type.
    await page.locator("#client-delivery-filter-form").getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Vente" }).click();
    await page.getByRole("button", { name: "Appliquer" }).click();

    await expect(table.getByText("CMD-2847")).toBeVisible();
    await expect(table.getByText("CMD-2839")).toBeVisible();
    await expect(table.getByText("TR-00042-XYZ")).toHaveCount(0);
    await expect(table.getByText("TR-00038-ABC")).toHaveCount(0);
  });

  test("ouvre le détail d'une opération avec les vrais champs (pas de produits inventés)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /CMD-2847/ }).click();

    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail.getByText("Siège de Matoto")).toBeVisible();
    await expect(detail.getByText("Client X")).toBeVisible();
    await expect(detail.getByText("ABARRY · OU3859")).toBeVisible();
    await expect(detail.getByText("12")).toBeVisible();
  });
});
