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
    // Résumé "Conducteur" du tableau = premier membre de equipe[] (source
    // canonique depuis le 27/08/2026, voir vehicleDriverSummary() dans
    // pages/espace-client/vehicules.vue) — plus le champ hérité conducteur.
    await expect(table.getByText("Mamadou Diallo")).toBeVisible();
    // Résumé "Capacité" : plusieurs catégories -> décompte, jamais un
    // nombre unique inventé (voir vehicleCapacitySummary()).
    await expect(table.getByText("2 catégories")).toBeVisible();

    // Ancien mock jamais réel (id fictif "ou3859", capacité "packs" en dur
    // sans formatage réel) : plus aucun statut "Entretien", qui n'existe pas
    // dans le modèle ELM — remplacé par Actif/Inactif dérivé de is_active.
    await expect(page.getByText("Entretien")).toHaveCount(0);
    await expect(table.getByText("Inactif")).toBeVisible();

    // veh-2 (ABARRY 2) : ni équipe ni capacité -> replis honnêtes.
    await expect(table.getByText("Non assigné")).toBeVisible();
    await expect(table.getByRole("row", { name: /ABARRY 2/ }).getByText("—", { exact: true })).toBeVisible();

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

  test("mobile : le détail d'un véhicule avec équipe affiche tous les livreurs, le propriétaire et les capacités par catégorie", async ({ page }) => {
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

    // Équipe complète (chantier du 27/08/2026 : le backend expose désormais
    // TOUS les membres, plus seulement le chauffeur) : la ligne "Conducteur"
    // (repli) ne doit plus apparaître quand l'équipe est renseignée.
    await expect(detail.getByText("Équipe de livraison")).toBeVisible();
    await expect(detail.getByText("Conducteur", { exact: true })).toHaveCount(0);
    await expect(detail.getByText("Mamadou Diallo")).toBeVisible();
    await expect(detail.getByText("+224620111222")).toBeVisible();
    await expect(detail.getByText("Chauffeur", { exact: true })).toBeVisible();
    await expect(detail.getByText("Ibrahima Sow")).toBeVisible();
    await expect(detail.getByText("+224620333444")).toBeVisible();
    await expect(detail.getByText("Convoyeur", { exact: true })).toBeVisible();

    // Propriétaire (nouveau, jamais affiché avant le 27/08/2026).
    await expect(detail.getByText("Propriétaire")).toBeVisible();
    await expect(detail.getByText("Issa Barry")).toBeVisible();
    await expect(detail.getByText("+224620010203")).toBeVisible();

    // Capacités par catégorie (jamais un nombre unique reconstitué) : la
    // ligne "Capacité" (repli) ne doit plus apparaître non plus.
    await expect(detail.getByText("Capacités")).toBeVisible();
    await expect(detail.locator(".client-delivery-detail__rows").getByText("Capacité", { exact: true })).toHaveCount(0);
    await expect(detail.getByText("Sachet eau")).toBeVisible();
    await expect(detail.getByText("800", { exact: true })).toBeVisible();
    await expect(detail.getByText("Bouteille")).toBeVisible();
    await expect(detail.getByText("540", { exact: true })).toBeVisible();
  });

  test("mobile : un véhicule sans équipe/capacité/propriétaire affiche des replis honnêtes, jamais une section vide", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/vehicules", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Voir les détails de ABARRY 2", exact: true }).click();

    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });

    // Replis (équipe/capacités/propriétaire absents côté backend pour ce
    // véhicule) : jamais un nom ou un téléphone inventé.
    await expect(detail.getByText("Conducteur", { exact: true })).toBeVisible();
    await expect(detail.getByText("Non assigné")).toBeVisible();
    await expect(detail.getByText("Capacité", { exact: true })).toBeVisible();
    await expect(detail.getByText("Équipe de livraison")).toHaveCount(0);
    await expect(detail.getByText("Capacités", { exact: true })).toHaveCount(0);
    await expect(detail.getByText("Propriétaire")).toHaveCount(0);
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
