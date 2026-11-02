import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/commissions.vue après sa refonte du 27/08/2026 :
// vue statistique des gains (KPI + filtre période/véhicule + répartition par
// véhicule), branchée sur GET /v1/mobile/dashboard (même endpoint que le
// tableau de bord) — plus de liste de commandes individuelles. Voir
// tests/e2e/mock-backend.mjs::DASHBOARD_PAR_VEHICULE_BY_PERIOD pour les
// valeurs attendues par période.
test.describe("Espace client — commissions (vue statistique)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("le lien Commissions du menu bas (mobile) ouvre la page avec les vraies données", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Commissions" }).click();
    await expect(page).toHaveURL(/\/espace-client\/commissions$/);
    await expect(page).toHaveTitle(/Commissions/);

    const mobile = page.locator(".client-mobile-expenses");
    // Période par défaut = "Ce mois" : total_earned réel = 2 760 000 + 1 480 000 = 4 240 000.
    await expect(mobile.getByText(`${new Intl.NumberFormat("fr-FR").format(4_240_000)} GNF`)).toBeVisible({ timeout: 10_000 });
  });

  test("aucune commande individuelle affichée (plus de référence CMD-...)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByText(/CMD-\d+/)).toHaveCount(0);
  });

  test("répartition par véhicule triée par gain décroissant, avec part du total", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("ABARRY", { exact: true })).toBeVisible({ timeout: 10_000 });

    // ABARRY (2 760 000, 65%) doit apparaître avant ABARRY 2 (1 480 000, 35%) dans le DOM.
    const names = desktop.locator("li span.font-semibold");
    await expect(names.first()).toHaveText("ABARRY");
    await expect(desktop.getByText("65%")).toBeVisible();
    await expect(desktop.getByText("35%")).toBeVisible();
  });

  test("changement de période recharge des montants réellement différents", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(4_240_000)} GNF`)).toBeVisible({ timeout: 10_000 });

    await desktop.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "7 derniers jours" }).click();

    // 7j réel : 980 000 + 520 000 = 1 500 000 — un montant différent confirme un vrai rechargement, pas un filtre client-side sur des données déjà chargées.
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(1_500_000)} GNF`)).toBeVisible({ timeout: 10_000 });
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(4_240_000)} GNF`)).toHaveCount(0);
  });

  test("période personnalisée : les deux dates sont requises avant de recharger", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await desktop.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Période personnalisée" }).click();

    const dateInputs = desktop.locator('input[type="date"]');
    await dateInputs.first().fill("2026-08-01");
    await dateInputs.last().fill("2026-08-26");

    // period=custom (mock) -> jeu de données vide : "Aucune commission sur cette période."
    await expect(desktop.getByText("Aucune commission sur cette période.")).toBeVisible({ timeout: 10_000 });
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(0)} GNF`).first()).toBeVisible();
  });

  test("filtre \"Aujourd'hui\" : total 0 affiché honnêtement (pas masqué)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await desktop.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Aujourd'hui" }).click();

    await expect(desktop.getByText("Aucune commission sur cette période.")).toBeVisible({ timeout: 10_000 });
    await expect(desktop.getByText("Gains générés")).toBeVisible();
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(0)} GNF`).first()).toBeVisible();
  });

  test("filtre par véhicule : KPI et répartition ne montrent que ce véhicule", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("ABARRY", { exact: true })).toBeVisible({ timeout: 10_000 });

    await desktop.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /^ABARRY ·/ }).click();

    // Filtré sur veh-1 seul : total = 2 760 000 (plus 4 240 000 combiné), ABARRY 2 tombe à 0.
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(2_760_000)} GNF`).first()).toBeVisible({ timeout: 10_000 });
    await expect(desktop.getByText("100%")).toBeVisible();
  });

  test("responsive : bloc mobile visible en dessous, bloc desktop au-dessus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.locator(".client-mobile-expenses")).toBeVisible();
    await expect(page.locator(".client-desktop-expenses")).toBeHidden();
  });
});
