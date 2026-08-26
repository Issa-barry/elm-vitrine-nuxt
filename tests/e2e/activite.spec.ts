import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

test.describe("Espace client — activité", () => {
  // Voir le commentaire équivalent dans tests/e2e/profil.spec.ts.
  test.describe.configure({ timeout: 90_000 });

  test("affiche les livraisons et commandes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByRole("heading", { name: "Livraisons" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Commandes" }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
