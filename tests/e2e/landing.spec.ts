import { test, expect } from "@playwright/test";

test.describe("Landing", () => {
  test("affiche la page d'accueil avec les CTA principaux", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Eau La Maman/);
    await expect(page.getByRole("heading", { name: "Eau La Maman" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Inscription" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("le lien Connexion mène à /connexion", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Connexion" }).first().click();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("le lien Inscription mène à /inscription", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Inscription" }).first().click();
    await expect(page).toHaveURL(/\/inscription$/);
  });
});
