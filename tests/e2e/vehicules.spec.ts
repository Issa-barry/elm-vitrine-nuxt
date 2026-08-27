import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Vue desktop (viewport par défaut de ce projet Playwright) : un DataTable
// avec les vraies données de GET /v1/mobile/vehicules/mine (voir
// tests/e2e/mock-backend.mjs::TEST_VEHICLES) — plus aucune donnée fictive
// ("ABARRY", statut "Entretien"...) depuis le branchement du 26/08/2026.

test.describe("Espace client — véhicules", () => {
  // Voir le commentaire équivalent dans tests/e2e/profil.spec.ts.
  test.describe.configure({ timeout: 90_000 });

  test("affiche le tableau des vrais véhicules (pas de mock)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByRole("main").getByText("Mes véhicules")).toBeVisible({ timeout: 10_000 });
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
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const search = page.locator(".client-desktop-vehicles").getByPlaceholder("Rechercher");
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill("ABARRY 2");

    const table = page.locator(".client-desktop-vehicles table");
    await expect(table.getByText("ABARRY 2", { exact: true })).toBeVisible();
    await expect(table.getByText("ABARRY", { exact: true })).toHaveCount(0);
  });

  test("mobile : cliquer une carte véhicule ouvre une boîte de dialogue (pas de navigation)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Voir les détails de ABARRY", exact: true }).click();

    // Reste sur /espace-client/vehicules — jamais une navigation vers
    // /espace-client/vehicules/[id] (demande du 27/08/2026).
    await expect(page).toHaveURL(/\/espace-client\/vehicules$/);

    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail.locator("svg")).toBeVisible(); // QR (immatriculation réelle)
    // "OU3859" apparaît deux fois par design (légende sous le QR +
    // ligne "Immatriculation") : on vérifie la ligne d'info dédiée.
    await expect(detail.locator(".client-delivery-detail__rows").getByText("OU3859")).toBeVisible();
    await expect(detail.getByText("Mamadou D.")).toBeVisible();
    // Jamais une liste de livreurs ni un téléphone : donnée absente du
    // contrat backend réel (voir le commentaire de openVehicleDetail() dans
    // pages/espace-client/vehicules.vue) — un seul champ "Conducteur".
    await expect(detail.getByText("Conducteur")).toBeVisible();
  });

  test("desktop : l'action \"œil\" ouvre la même boîte de dialogue", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Voir ABARRY", exact: true }).click();

    await expect(page).toHaveURL(/\/espace-client\/vehicules$/);
    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail.locator(".client-delivery-detail__rows").getByText("OU3859")).toBeVisible();
  });
});
