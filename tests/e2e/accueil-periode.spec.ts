import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Filtre de période de l'accueil. Réponses interceptées : ces tests vérifient
// l'interface et les paramètres envoyés, le filtrage réel est couvert par
// tests/Feature/Api/Client/PeriodeComptableFiltreTest.php côté elm-monolithe.
test.use({ serviceWorkers: "block" });

const maintenant = new Date();
const anneeCourante = String(maintenant.getUTCFullYear());
const moisCourant = String(maintenant.getUTCMonth() + 1);
const gnf = (montant: number) => `${new Intl.NumberFormat("fr-FR").format(montant)} GNF`;

// Montants distincts par période, pour vérifier que tout l'accueil suit la sélection.
const MONTANTS: Record<string, number> = { hier: 1_000, tout: 9_000, P1: 2_000, annee: 7_000 };
const montantDe = (query: URLSearchParams) => {
  if (query.get("periode")) return MONTANTS[query.get("periode")!] ?? 0;
  if (query.get("quinzaine") === "P1") return MONTANTS.P1!;
  if (query.get("annee") && !query.get("mois")) return MONTANTS.annee!;
  return 5_000;
};

const bornes = (query: URLSearchParams) => {
  if (query.get("periode") === "tout") return { date_debut: null, date_fin: null };
  if (query.get("periode") === "hier") return { date_debut: "2026-11-02", date_fin: "2026-11-02" };
  return { date_debut: "2026-11-01", date_fin: "2026-11-30" };
};

const dashboard = (query: URLSearchParams) => {
  const montant = montantDe(query);
  return {
    filters: { period: "custom", vehicule_id: null, statut: null, ...bornes(query) },
    summary: { total_earned: montant, total_paid: montant / 2, frais_depenses_total: 0, balance: montant / 2, operations_count: 1 },
    depenses_total: montant / 10,
    summary_evolution: null,
    comparison_period: null,
    par_vehicule: [{ vehicule_id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859", total_earned: montant, total_paid: 0, frais_depenses: 0, balance: montant, operations: 1 }],
    vehicules: [],
  };
};

async function ouvrirAccueil(page: Page) {
  const requetes = { dashboard: [] as URLSearchParams[], expenses: [] as URLSearchParams[] };

  await page.route("**/api/client/dashboard*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    requetes.dashboard.push(query);
    await route.fulfill({ json: dashboard(query) });
  });
  await page.route("**/api/client/expenses*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    requetes.expenses.push(query);
    await route.fulfill({
      json: {
        data: [],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, last_page: 1, per_page: 1, total: 0 },
        filters: { vehicule_id: null, depense_type_id: null, statut: null, date_debut: query.get("date_debut"), date_fin: query.get("date_fin") },
        total_valide: query.get("date_debut") === "2026-11-02" ? 111 : 333,
      },
    });
  });

  await page.setViewportSize({ width: 440, height: 956 });
  await loginAsTestUser(page);
  return requetes;
}

const accueil = (page: Page) => page.locator(".client-mobile-dashboard");
const bouton = (page: Page) => accueil(page).getByRole("button", { name: /^Période :/ });
const panneau = (page: Page) => page.locator(".p-drawer.client-delivery-filter-drawer");

async function choisirRapide(page: Page, nom: string) {
  await bouton(page).click();
  await panneau(page).getByRole("button", { name: nom, exact: true }).click();
  await panneau(page).getByRole("button", { name: "Appliquer" }).click();
  await expect(bouton(page)).toContainText(nom);
}

test.describe("Espace client — filtre de période de l'accueil", () => {
  test.describe.configure({ timeout: 120_000 });

  test("placé juste avant la carte Cumul, s'ouvre sur « Ce mois » avec la même période partout", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);

    await expect(bouton(page)).toContainText("Ce mois");
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    const positionBouton = await bouton(page).boundingBox();
    const positionCarte = await accueil(page).locator(".client-mobile-balance-card").boundingBox();
    expect(positionBouton!.y + positionBouton!.height).toBeLessThanOrEqual(positionCarte!.y);

    const premiere = requetes.dashboard[0]!;
    expect(premiere.get("annee")).toBe(anneeCourante);
    expect(premiere.get("mois")).toBe(moisCourant);
    expect(premiere.get("quinzaine")).toBe("TOUT");
    expect(premiere.get("period")).toBeNull();
  });

  test("une période rapide met à jour tous les montants, y compris les dépenses et les véhicules", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    await choisirRapide(page, "Hier");

    await expect(accueil(page).locator(".client-mobile-balance-amount")).toHaveText(gnf(1_000));
    await expect(accueil(page).locator(".client-mobile-balance-meta").getByText(gnf(500)).first()).toBeVisible();
    await expect(accueil(page).locator(".client-mobile-vehicle-amount")).toHaveText(gnf(1_000));
    await expect(accueil(page).locator(".client-mobile-summary-card")).toContainText(gnf(111));

    expect(requetes.dashboard.at(-1)?.get("periode")).toBe("hier");
    expect(requetes.dashboard.at(-1)?.get("annee")).toBeNull();
    expect(requetes.expenses.at(-1)?.get("date_debut")).toBe("2026-11-02");
    expect(requetes.expenses.at(-1)?.get("date_fin")).toBe("2026-11-02");
    expect(requetes.expenses.at(-1)?.get("statut")).toBe("valide");
  });

  test("année, mois et quinzaine : P1, puis toute l'année", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    await bouton(page).click();
    await panneau(page).getByRole("button", { name: "P1 : 01–15" }).click();
    await expect(panneau(page).getByRole("button", { name: "Ce mois", exact: true })).toHaveAttribute("aria-pressed", "false");
    await panneau(page).getByRole("button", { name: "Appliquer" }).click();
    await expect(bouton(page)).toContainText("· P1");
    await expect(accueil(page).locator(".client-mobile-balance-amount")).toHaveText(gnf(2_000));
    expect(requetes.dashboard.at(-1)?.get("quinzaine")).toBe("P1");

    await bouton(page).click();
    await panneau(page).getByRole("combobox", { name: "Mois" }).click();
    await page.getByRole("option", { name: "Toute l’année" }).click();
    await expect(panneau(page).getByRole("group", { name: "Quinzaine" })).toHaveCount(0);
    await panneau(page).getByRole("button", { name: "Appliquer" }).click();
    await expect(bouton(page)).toContainText(`Année ${anneeCourante}`);
    await expect(accueil(page).locator(".client-mobile-balance-amount")).toHaveText(gnf(7_000));
    expect(requetes.dashboard.at(-1)?.get("annee")).toBe(anneeCourante);
    expect(requetes.dashboard.at(-1)?.get("mois")).toBeNull();
  });

  test("toutes les périodes, puis Réinitialiser revient à « Ce mois »", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    await choisirRapide(page, "Toutes les périodes");
    await expect(accueil(page).locator(".client-mobile-balance-amount")).toHaveText(gnf(9_000));
    expect(requetes.expenses.at(-1)?.get("date_debut")).toBeNull();

    await accueil(page).locator(".client-mobile-summary-card").click();
    await expect(page).toHaveURL(/\/espace-client\/depenses\?periode=toutes$/);
    await page.goBack();

    await expect(bouton(page)).toContainText("Toutes les périodes");
    await bouton(page).click();
    await panneau(page).getByRole("button", { name: "Réinitialiser" }).click();
    await panneau(page).getByRole("button", { name: "Appliquer" }).click();
    await expect(bouton(page)).toContainText("Ce mois");
    await expect(accueil(page).locator(".client-mobile-balance-amount")).toHaveText(gnf(5_000));
  });

  test("une sélection identique ne relance aucune requête", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });
    await expect(accueil(page).locator(".client-mobile-summary-card")).toContainText(gnf(333));

    const avant = requetes.dashboard.length;
    await bouton(page).click();
    await panneau(page).getByRole("button", { name: "Appliquer" }).click();
    await expect(panneau(page)).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(requetes.dashboard.length).toBe(avant);
  });

  test("une période sans commission le dit", async ({ page }) => {
    await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    await choisirRapide(page, "Semaine dernière");
    await expect(accueil(page).getByText("Aucune commission sur cette période.")).toBeVisible();
  });

  test("la période est conservée vers Dépenses et Commissions", async ({ page }) => {
    const requetes = await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    // Période comptable : partagée entre les écrans.
    await bouton(page).click();
    await panneau(page).getByRole("button", { name: "P1 : 01–15" }).click();
    await panneau(page).getByRole("button", { name: "Appliquer" }).click();
    await expect(bouton(page)).toContainText("· P1");
    await accueil(page).locator(".client-mobile-summary-card").click();
    await expect(page).toHaveURL(/\/espace-client\/depenses$/);
    await expect(page.locator(".client-mobile-expenses").getByRole("region", { name: "Période comptable" }).getByRole("button", { name: "P1 : 01–15" }))
      .toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    await expect.poll(() => requetes.expenses.at(-1)?.get("quinzaine")).toBe("P1");
    await page.goBack();
    await expect(bouton(page)).toContainText("· P1");

    // Période rapide : transmise par ses bornes, calculées par le serveur.
    await choisirRapide(page, "Hier");
    await expect(accueil(page).locator(".client-mobile-summary-card")).toHaveAttribute("href", "/espace-client/depenses?du=2026-11-02&au=2026-11-02");
    await accueil(page).locator(".client-mobile-vehicle-row").click();
    await expect(page).toHaveURL(/\/espace-client\/commissions\?vehicule_id=veh-1&du=2026-11-02&au=2026-11-02$/);
    await expect.poll(() => requetes.dashboard.at(-1)?.get("date_debut")).toBe("2026-11-02");
    expect(requetes.dashboard.at(-1)?.get("vehicule_id")).toBe("veh-1");
  });

  test("tient à 320 px et reste disponible en bureau", async ({ page }) => {
    await ouvrirAccueil(page);
    await expect(accueil(page).getByText(gnf(5_000)).first()).toBeVisible({ timeout: 30_000 });

    await page.setViewportSize({ width: 320, height: 700 });
    await expect(bouton(page)).toBeVisible();
    await bouton(page).click();
    const largeurs = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(largeurs.page).toBeLessThanOrEqual(largeurs.ecran);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".client-desktop-dashboard").getByRole("button", { name: /^Période :/ })).toBeVisible();
  });
});
