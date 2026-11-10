import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Gains multi-activités (ADR 0054 côté elm-monolithe) contre mock-backend.mjs.
// Compte de référence 601020397 : propriétaire ET livreur du véhicule BE8120,
// parrain du véhicule BE7955 d'un tiers, consultant de SOGECO Conseil. Les
// montants et les droits sont garantis côté backend
// (tests/Feature/Api/Client/GainsMultiActivitesTest.php) : ici, l'affichage,
// la recherche et les paramètres envoyés.
async function loginMulti(page: Page): Promise<void> {
  await page.goto("/connexion", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(2000);
  await page.getByLabel("Numéro de téléphone").fill("601020397");
  await page.getByPlaceholder("••••••••").fill("MotDePasse123");
  await expect(async () => {
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await page.waitForURL(/\/espace-client$/, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
}

function requetesDashboard(page: Page): URLSearchParams[] {
  const requetes: URLSearchParams[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/client/dashboard") requetes.push(url.searchParams);
  });
  return requetes;
}

test.describe("Gains multi-activités", () => {
  test.describe.configure({ timeout: 90_000 });

  test("l'accueil cumule les quatre activités sans répartition, sans doubler un véhicule", async ({ page }) => {
    await loginMulti(page);
    const bureau = page.locator(".client-desktop-dashboard");

    await expect(bureau.getByText(/130\s000 GNF/).first()).toBeVisible({ timeout: 20_000 });
    await expect(bureau.getByTestId("repartition-activites")).toHaveCount(0);

    // BE8120 : une seule ligne, deux liens.
    const kaloum = bureau.getByRole("link", { name: /KALOUM/ });
    await expect(kaloum).toHaveCount(1);
    await expect(kaloum.locator('[data-activite="proprietaire"]')).toBeVisible();
    await expect(kaloum.locator('[data-activite="livreur"]')).toBeVisible();
    await expect(bureau.getByRole("link", { name: /MATOTO/ }).locator('[data-activite="parrain"]')).toBeVisible();
  });

  test("en mobile, l'accueil n'affiche pas de répartition par activité", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginMulti(page);
    const mobile = page.locator(".client-mobile-dashboard");

    await expect(mobile.locator(".client-mobile-vehicle-row", { hasText: "MATOTO" })).toBeVisible({ timeout: 20_000 });
    await expect(mobile.getByTestId("repartition-activites")).toHaveCount(0);
    await expect(mobile.locator(".client-mobile-vehicle-row", { hasText: "MATOTO" }).locator('[data-activite="parrain"]')).toBeVisible();
  });

  test("la page Commissions répartit les gains par activité, sans détail par commission", async ({ page }) => {
    await loginMulti(page);
    const requetes: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname === "/api/client/commissions") requetes.push(pathname);
    });
    await page.goto("/espace-client/commissions");
    const bureau = page.locator(".client-desktop-expenses");

    await expect(bureau.getByTestId("repartition-activites").locator("li")).toHaveCount(4, { timeout: 20_000 });
    await expect(bureau.getByText("Détail des commissions")).toHaveCount(0);
    expect(requetes).toHaveLength(0);
  });

  // Même présentation que « Gains par véhicule » : gain décroissant, part du total, barre.
  test("la répartition par activité suit la présentation de Gains par véhicule", async ({ page }) => {
    await loginMulti(page);
    await page.goto("/espace-client/commissions");

    const bureau = page.locator(".client-desktop-expenses").getByTestId("repartition-activites");
    const lignes = bureau.locator("li");
    await expect(lignes).toHaveCount(4, { timeout: 20_000 });
    await expect(bureau.getByText("Sur la période")).toBeVisible();
    await expect(lignes.nth(0)).toHaveAttribute("data-activite", "consultant");
    await expect(lignes.nth(0)).toContainText("38%");
    await expect(lignes.nth(1)).toHaveAttribute("data-activite", "proprietaire");
    await expect(lignes.nth(2)).toHaveAttribute("data-activite", "parrain");
    await expect(lignes.nth(3)).toHaveAttribute("data-activite", "livreur");
    await expect(bureau.getByRole("progressbar")).toHaveCount(4);
    await expect(bureau.getByRole("progressbar", { name: "Consultant, 38%" })).toHaveAttribute("aria-valuenow", "38");
    await expect(bureau.getByText("Reste à payer")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = page.locator(".client-mobile-expenses").getByTestId("repartition-activites");
    await expect(mobile.getByRole("progressbar")).toHaveCount(4);
    await expect(mobile.locator("[data-activite]").first()).toContainText(/Consultant.*50\s000 GNF · 38%/);
    await expect(mobile.getByText("Sur la période")).toBeVisible();
  });

  test("le filtre véhicule propose le véhicule parrainé avec la nature du lien", async ({ page }) => {
    await loginMulti(page);
    const requetes = requetesDashboard(page);
    await page.goto("/espace-client/commissions");
    const bureau = page.locator(".client-desktop-expenses");
    await expect(bureau.getByTestId("repartition-activites")).toBeVisible({ timeout: 20_000 });

    // Année et mois de la période comptable, puis Période, puis Véhicule.
    await bureau.getByRole("combobox").nth(3).click();
    await expect(page.getByRole("option", { name: "KALOUM · BE8120 (Livreur)" })).toBeVisible();
    await page.getByRole("option", { name: "MATOTO · BE7955 (Parrain)" }).click();

    await expect.poll(() => requetes.at(-1)?.get("vehicule_id")).toBe("veh-c");
  });

  test("Mes véhicules liste chaque véhicule une fois, le parrainé en lecture restreinte", async ({ page }) => {
    await loginMulti(page);
    await page.goto("/espace-client/vehicules");
    const tableau = page.locator(".client-desktop-vehicles");

    await expect(tableau.getByRole("row")).toHaveCount(3, { timeout: 20_000 });
    const kaloum = tableau.getByRole("row", { name: /KALOUM/ });
    await expect(kaloum.locator('[data-activite="proprietaire"]')).toBeVisible();
    await expect(kaloum.locator('[data-activite="livreur"]')).toBeVisible();

    await tableau.getByRole("button", { name: "MATOTO", exact: true }).click();
    const fiche = page.locator(".client-delivery-detail");
    await expect(fiche.getByText("Mamadou BAH")).toBeVisible();
    await expect(fiche.locator('[data-activite="parrain"]')).toBeVisible();
    await expect(fiche.getByRole("note")).toContainText("Véhicule que vous parrainez");
    await expect(fiche.getByText("Téléphone")).toHaveCount(0);
    await expect(fiche.getByText("Équipe de livraison")).toHaveCount(0);
    await expect(fiche.getByText("Votre rémunération de parrain")).toBeVisible();
    await expect(fiche.getByText(/200 GNF \/ pack/)).toBeVisible();
  });

  test("la recherche des véhicules trouve le propriétaire et la nature du lien", async ({ page }) => {
    await loginMulti(page);
    await page.goto("/espace-client/vehicules");
    const tableau = page.locator(".client-desktop-vehicles");
    await expect(tableau.getByRole("row")).toHaveCount(3, { timeout: 20_000 });

    await tableau.getByPlaceholder("Rechercher").fill("mamadou");
    await expect(tableau.getByRole("row")).toHaveCount(2);
    await expect(tableau.getByRole("row", { name: /MATOTO/ })).toBeVisible();

    await tableau.getByPlaceholder("Rechercher").fill("livreur");
    await expect(tableau.getByRole("row")).toHaveCount(2);
    await expect(tableau.getByRole("row", { name: /KALOUM/ })).toBeVisible();

    await tableau.getByPlaceholder("Rechercher").fill("BE7955");
    await expect(tableau.getByRole("row", { name: /MATOTO/ })).toBeVisible();
  });

  test("un compte à une seule activité n'a pas de répartition", async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page.locator(".client-desktop-dashboard").getByText(/Commission générée/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("repartition-activites")).toHaveCount(0);

    await page.goto("/espace-client/commissions");
    const bureau = page.locator(".client-desktop-expenses");
    await expect(bureau.getByText("Gains par véhicule")).toBeVisible({ timeout: 20_000 });
    await expect(bureau.getByTestId("repartition-activites")).toHaveCount(0);
  });
});
