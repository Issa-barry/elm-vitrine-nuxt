import { test, expect } from "@playwright/test";

// Vue desktop (viewport par défaut de ce projet Playwright) : un DataTable
// avec des colonnes propres (pas de "Commissions générées", qui n'existe
// que dans les cartes mobiles) — voir pages/espace-client/vehicules.vue.

test.describe("Espace client — véhicules", () => {
  test("affiche le tableau des véhicules", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("main").getByText("Mes véhicules")).toBeVisible();
    await expect(page.getByText("Véhicules rattachés à votre compte propriétaire")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Immatriculation" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Conducteur" })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
