import { test, expect } from "@playwright/test";

test.describe("Espace client — activité", () => {
  test("affiche les livraisons et commandes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Livraisons" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Commandes" }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
