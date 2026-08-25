import { test, expect } from "@playwright/test";

test.describe("Espace client — profil", () => {
  test("affiche les informations personnelles", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Mon profil/);
    await expect(page.getByText("Informations personnelles")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
