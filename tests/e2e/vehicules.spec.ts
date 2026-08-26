import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Vue desktop (viewport par défaut de ce projet Playwright) : un DataTable
// avec les vraies données de GET /v1/mobile/vehicules/mine (voir
// tests/e2e/mock-backend.mjs::TEST_VEHICLES) — plus aucune donnée fictive
// ("ABARRY", statut "Entretien"...) depuis le branchement du 26/08/2026.

test.describe("Espace client — véhicules", () => {
  test("affiche le tableau des vrais véhicules (pas de mock)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("main").getByText("Mes véhicules")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Immatriculation" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Conducteur" })).toBeVisible();

    const table = page.locator(".client-desktop-vehicles table");
    await expect(table.getByText("ABARRY", { exact: true })).toBeVisible();
    await expect(table.getByText("OU3859")).toBeVisible();
    await expect(table.getByText("Mamadou D.")).toBeVisible();

    // Ancien mock jamais réel (id fictif "ou3859", capacité "packs" en dur
    // sans formatage réel) : plus aucun statut "Entretien", qui n'existe pas
    // dans le modèle ELM — remplacé par Actif/Inactif dérivé de is_active.
    await expect(page.getByText("Entretien")).toHaveCount(0);
    await expect(table.getByText("Inactif")).toBeVisible();

    // conducteur null (ABARRY 2 dans le mock) -> libellé neutre, jamais un
    // nom inventé.
    await expect(table.getByText("Non assigné")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("filtre par statut réel (Actif/Inactif, pas Entretien)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const search = page.locator(".client-desktop-vehicles").getByPlaceholder("Rechercher");
    await search.fill("ABARRY 2");

    const table = page.locator(".client-desktop-vehicles table");
    await expect(table.getByText("ABARRY 2", { exact: true })).toBeVisible();
    await expect(table.getByText("ABARRY", { exact: true })).toHaveCount(0);
  });
});
