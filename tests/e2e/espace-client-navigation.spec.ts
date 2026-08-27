import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

test.describe("Espace client — navigation", () => {
  test("le tableau de bord s'affiche avec le menu de navigation", async ({ page }) => {
    await loginAsTestUser(page);

    await expect(page).toHaveTitle(/Tableau de bord/);
    await expect(page.getByText("Solde par véhicule")).toBeVisible();
    const sidebar = page.locator(".layout-menu");
    await expect(sidebar.getByRole("link", { name: "Véhicules" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Livraisons" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Mon profil" })).toBeVisible();
  });

  test("navigue vers Véhicules depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.locator(".layout-menu").getByRole("link", { name: "Véhicules" }).click();
    await expect(page).toHaveURL(/\/espace-client\/vehicules$/);
  });

  test("navigue vers Livraisons depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.locator(".layout-menu").getByRole("link", { name: "Livraisons" }).click();
    await expect(page).toHaveURL(/\/espace-client\/activite$/);
  });

  test("navigue vers Commissions depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    // Scopé à .layout-menu (sidebar desktop) : "Commissions" sans scope
    // collisionne avec les liens "Voir les commissions de ABARRY..." de la
    // carte dashboard "Solde par véhicule", visible sur cette même page à
    // viewport desktop (voir le même correctif dans tests/e2e/commissions.spec.ts).
    await page.locator(".layout-menu").getByRole("link", { name: "Commissions" }).click();
    await expect(page).toHaveURL(/\/espace-client\/commissions$/);
  });

  test("navigue vers Mon profil depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.locator(".layout-menu").getByRole("link", { name: "Mon profil" }).click();
    await expect(page).toHaveURL(/\/espace-client\/profil$/);
  });

  test("Retour au site ramène vers la landing", async ({ page }) => {
    await loginAsTestUser(page);
    await page.locator(".layout-menu").getByRole("link", { name: "Retour au site" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
