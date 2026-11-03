import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/depenses.vue branché sur
// GET /v1/mobile/depenses/mine (mock-backend.mjs::TEST_EXPENSES, 5 dépenses :
// 3 validées, 1 soumise, 1 rejetée, réparties sur 2 véhicules).
test.describe("Espace client — dépenses", () => {
  test.describe.configure({ timeout: 90_000 });

  test("le lien Dépenses du menu bas (mobile) ouvre la page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Dépenses" }).click();
    await expect(page).toHaveURL(/\/espace-client\/depenses$/);
    await expect(page).toHaveTitle(/Dépenses/);
  });

  test("le menu bas à 5 onglets ne déborde pas sur un petit écran (320px)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await loginAsTestUser(page);

    const items = page.locator(".client-mobile-bottom-nav .client-mobile-nav-item");
    await expect(items).toHaveCount(5);
    for (const box of await items.evaluateAll((elements) => elements.map((element) => {
      const label = element.querySelector("span")!;
      return { itemWidth: element.clientWidth, labelWidth: label.scrollWidth, right: element.getBoundingClientRect().right };
    }))) {
      expect(box.labelWidth).toBeLessThanOrEqual(box.itemWidth);
      expect(box.right).toBeLessThanOrEqual(320);
    }
  });

  test("affiche les vraies dépenses (pas de mock)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page).toHaveTitle(/Dépenses/);

    const desktop = page.locator(".client-desktop-expenses");
    // Total validé réel : 68 400 (dep-1) + 12 700 (dep-2) + 74 300 (dep-4) = 155 400.
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(155_400)} GNF`)).toBeVisible({ timeout: 10_000 });

    // Les 5 dépenses (tous statuts) apparaissent dans le tableau par défaut.
    await expect(desktop.getByText("Carburant").first()).toBeVisible();
    await expect(desktop.getByText("Entretien")).toBeVisible();
    await expect(desktop.getByText("Autre")).toBeVisible();
  });

  // Régression 02/11 : une avance sur salaire (sans véhicule) validée au
  // back-office n'apparaissait pas et la carte Dépenses restait à 0 GNF.
  test("affiche une dépense personnelle de livreur et l'inclut dans la carte Dépenses", async ({ page }) => {
    const personalExpense = {
      id: "dep-personnelle",
      date: "2026-11-02",
      montant: 25_000,
      type_code: "avance_salaire",
      type_label: "Avance sur salaire",
      statut: "valide",
      statut_label: "Validé",
      commentaire: null,
      vehicule: null,
    };
    await page.route("**/api/client/expenses**", (route) => route.fulfill({
      json: {
        data: [personalExpense],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
        filters: { vehicule_id: null, depense_type_id: null, statut: null, date_debut: null, date_fin: null },
      },
    }));
    await page.route("**/api/client/dashboard**", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...await response.json(), depenses_total: 25_000 } });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    const amount = `${new Intl.NumberFormat("fr-FR").format(25_000)} GNF`;
    const expensesCard = page.locator(".client-mobile-summary-card");
    await expect(expensesCard.getByText(amount)).toBeVisible({ timeout: 10_000 });

    await expensesCard.click();
    await expect(page).toHaveURL(/\/espace-client\/depenses$/);

    const mobile = page.locator(".client-mobile-expenses");
    await expect(mobile.getByText(amount)).toBeVisible({ timeout: 10_000 });
    await expect(mobile.getByText("1 dépense validée")).toBeVisible();

    await mobile.getByRole("tab", { name: "Détails" }).click();
    await expect(mobile.getByText("Avance sur salaire")).toBeVisible();
    await expect(mobile.getByText("Dépense personnelle")).toBeVisible();
  });

  test.describe("regroupement par mois (mobile)", () => {
    const formatGnf = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;
    const stubExpense = (id: string, date: string, montant: number, typeLabel: string, statut = "valide", commentaire: string | null = null) => ({
      id, date, montant, type_code: "autre", type_label: typeLabel, statut, statut_label: statut === "valide" ? "Validé" : "Rejeté", commentaire, vehicule: null,
    });
    const STUB_EXPENSES = [
      stubExpense("a", "2026-11-02", 25_000, "Avance sur salaire"),
      stubExpense("b", "2026-10-15", 8_000, "Transport", "valide", "Taxi vers le dépôt"),
      stubExpense("c", "2026-10-10", 900, "Transport", "rejete"),
      stubExpense("d", "2025-10-06", 5_000, "Avance sur salaire"),
    ];

    async function openDetails(page: import("@playwright/test").Page, queries: string[] = []) {
      await page.route("**/api/client/expenses**", (route) => {
        const url = new URL(route.request().url());
        queries.push(url.search);
        const debut = url.searchParams.get("date_debut");
        const fin = url.searchParams.get("date_fin");
        const data = STUB_EXPENSES.filter((expense) => (!debut || expense.date >= debut) && (!fin || expense.date <= fin));
        return route.fulfill({
          json: {
            data,
            links: { first: null, last: null, prev: null, next: null },
            meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
            filters: { vehicule_id: null, depense_type_id: null, statut: null, date_debut: debut, date_fin: fin },
          },
        });
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await loginAsTestUser(page);
      await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("load");
      await page.waitForTimeout(1000);

      const mobile = page.locator(".client-mobile-expenses");
      await mobile.getByRole("tab", { name: "Détails" }).click();
      return mobile;
    }

    async function applyCustomPeriod(page: import("@playwright/test").Page, start: string, end: string) {
      await page.getByRole("button", { name: /Filtrer les dépenses/ }).click();
      const drawer = page.locator(".client-delivery-filter-drawer");
      await drawer.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Période personnalisée" }).click();
      await drawer.getByLabel("Date de début").fill(start);
      await drawer.getByLabel("Date de fin").fill(end);
      await drawer.getByRole("button", { name: "Appliquer" }).click();
      return drawer;
    }

    test("regroupe du mois le plus récent au plus ancien, avec un total limité aux validées", async ({ page }) => {
      const mobile = await openDetails(page);

      const toggles = mobile.locator(".client-mobile-expenses__month-toggle");
      await expect(toggles.locator("strong")).toHaveText(["Novembre 2026", "Octobre 2026", "Octobre 2025"]);
      await expect(toggles.nth(1)).toContainText("2 dépenses");
      await expect(toggles.nth(1)).toContainText(formatGnf(8_000));
      await expect(toggles.nth(0)).toContainText("1 dépense ");
    });

    test("réduit puis rouvre un mois au clic", async ({ page }) => {
      const mobile = await openDetails(page);
      const november = mobile.locator(".client-mobile-expenses__month").first();

      await expect(november.getByText("Avance sur salaire")).toBeVisible();
      await november.locator(".client-mobile-expenses__month-toggle").click();
      await expect(november.getByText("Avance sur salaire")).toBeHidden();
      await expect(november.locator(".client-mobile-expenses__month-toggle")).toHaveAttribute("aria-expanded", "false");

      await november.locator(".client-mobile-expenses__month-toggle").click();
      await expect(november.getByText("Avance sur salaire")).toBeVisible();
    });

    test("envoie la période personnalisée au backend et ne garde que les mois concernés", async ({ page }) => {
      const queries: string[] = [];
      const mobile = await openDetails(page, queries);

      await applyCustomPeriod(page, "2026-10-01", "2026-10-31");

      await expect(mobile.locator(".client-mobile-expenses__month-toggle strong")).toHaveText(["Octobre 2026"]);
      expect(queries.at(-1)).toContain("date_debut=2026-10-01");
      expect(queries.at(-1)).toContain("date_fin=2026-10-31");
      await expect(mobile.getByRole("button", { name: /Retirer le filtre Période/ })).toBeVisible();

      await mobile.getByRole("button", { name: "Tout effacer" }).click();
      await expect(mobile.locator(".client-mobile-expenses__month-toggle")).toHaveCount(3);
    });

    test("refuse une période personnalisée incohérente", async ({ page }) => {
      await openDetails(page);

      const drawer = await applyCustomPeriod(page, "2026-10-31", "2026-10-01");

      await expect(drawer.getByRole("alert")).toHaveText("La date de fin doit suivre la date de début.");
      await expect(drawer.getByRole("button", { name: "Appliquer" })).toBeVisible();
    });

    test("combine type et recherche, puis réinitialise depuis l'état vide", async ({ page }) => {
      const mobile = await openDetails(page);

      await page.getByRole("button", { name: /Filtrer les dépenses/ }).click();
      const drawer = page.locator(".client-delivery-filter-drawer");
      await drawer.getByRole("combobox").nth(2).click();
      await page.getByRole("option", { name: "Transport" }).click();
      await drawer.getByRole("button", { name: "Appliquer" }).click();

      await expect(mobile.locator(".client-mobile-expenses__month-toggle strong")).toHaveText(["Octobre 2026"]);

      const searchInput = mobile.getByPlaceholder("Type, motif ou véhicule");
      await searchInput.fill("taxi");
      await expect(mobile.locator(".client-mobile-expenses__card")).toHaveCount(1);

      await searchInput.fill("introuvable");
      await expect(mobile.getByText("Aucune dépense ne correspond")).toBeVisible();

      await mobile.getByRole("button", { name: "Réinitialiser" }).click();
      await expect(mobile.locator(".client-mobile-expenses__card")).toHaveCount(4);
      await expect(searchInput).toHaveValue("");
    });
  });

  test("filtre par statut réel (Validée/Soumise/Rejetée)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("Entretien")).toBeVisible({ timeout: 10_000 });

    // Sélecteur de statut : 1er des deux Select du bandeau de filtre.
    await desktop.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Validée", exact: true }).click();

    await expect(desktop.getByText("Entretien")).toHaveCount(0); // soumis
    await expect(desktop.getByText("Autre")).toHaveCount(0); // rejeté
    await expect(desktop.getByText("Carburant").first()).toBeVisible();
  });

  test("filtre par véhicule réel", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("Entretien")).toBeVisible({ timeout: 10_000 });

    // Sélecteur de véhicule : 2e des deux Select du bandeau de filtre.
    await desktop.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /ABARRY 2/ }).click();

    // Seules les dépenses de veh-2 (Entretien, Carburant du 18/08) restent.
    await expect(desktop.getByText("Entretien")).toBeVisible();
    await expect(desktop.getByText("Autre")).toHaveCount(0); // dep-5 est sur veh-1
  });
});
