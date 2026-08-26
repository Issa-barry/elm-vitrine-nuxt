import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

test.describe("Espace client — navigation", () => {
  test("le tableau de bord s'affiche avec le menu de navigation", async ({ page }) => {
    await loginAsTestUser(page);

    await expect(page).toHaveTitle(/Tableau de bord/);
    await expect(page.getByText("Solde par véhicule")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mes véhicules" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Activité & livraisons" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mon profil" })).toBeVisible();
  });

  test("navigue vers Mes véhicules depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.getByRole("link", { name: "Mes véhicules" }).click();
    await expect(page).toHaveURL(/\/espace-client\/vehicules$/);
  });

  test("navigue vers Activité & livraisons depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.getByRole("link", { name: "Activité & livraisons" }).click();
    await expect(page).toHaveURL(/\/espace-client\/activite$/);
  });

  test("navigue vers Mon profil depuis le menu", async ({ page }) => {
    await loginAsTestUser(page);
    await page.getByRole("link", { name: "Mon profil" }).click();
    await expect(page).toHaveURL(/\/espace-client\/profil$/);
  });

  test("Retour au site ramène vers la landing", async ({ page }) => {
    await loginAsTestUser(page);
    await page.getByRole("link", { name: "Retour au site" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
