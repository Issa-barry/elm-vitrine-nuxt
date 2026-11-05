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

function requetesCommissions(page: Page): URLSearchParams[] {
  const requetes: URLSearchParams[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/client/commissions") requetes.push(url.searchParams);
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

  test("chaque commission porte son origine, l'annulée reste visible", async ({ page }) => {
    await loginMulti(page);
    await page.goto("/espace-client/commissions");
    const detail = page.locator(".client-desktop-expenses").getByTestId("commissions-detail");
    const lignes = detail.getByTestId("commission-ligne");

    await expect(lignes).toHaveCount(5, { timeout: 20_000 });
    await expect(lignes.filter({ hasText: "VTE-031126-001" }).locator('[data-activite="parrain"]')).toBeVisible();
    await expect(lignes.filter({ hasText: "VTE-031126-001" })).toContainText("MATOTO · BE7955");
    await expect(lignes.filter({ hasText: "VTE-031126-002" }).locator('[data-activite="proprietaire"]')).toBeVisible();
    await expect(lignes.filter({ hasText: "VTE-031126-003" }).locator('[data-activite="livreur"]')).toBeVisible();
    await expect(lignes.filter({ hasText: "VTE-031126-004" })).toContainText("Consultant · SOGECO Conseil");
    await expect(lignes.filter({ hasText: "VTE-031126-005" })).toContainText("Annulée");
    // Total du détail = résumé du backend, sans l'annulée.
    await expect(detail.getByTestId("commissions-detail-resume")).toContainText(/130\s000 GNF/);
    await expect(page.locator(".client-desktop-expenses").getByTestId("repartition-activites").locator("li")).toHaveCount(4);
  });

  test("le filtre Activité et la recherche passent par le backend", async ({ page }) => {
    await loginMulti(page);
    const requetes = requetesCommissions(page);
    await page.goto("/espace-client/commissions");
    const bureau = page.locator(".client-desktop-expenses");
    const lignes = bureau.getByTestId("commission-ligne");
    await expect(lignes).toHaveCount(5, { timeout: 20_000 });

    await bureau.getByRole("combobox", { name: "Filtrer par activité" }).click();
    await page.getByRole("option", { name: "Parrain" }).click();
    await expect(lignes).toHaveCount(1);
    await expect(lignes.first().locator('[data-activite="parrain"]')).toBeVisible();
    expect(requetes.at(-1)?.get("activite")).toBe("parrain");

    await bureau.getByRole("combobox", { name: "Filtrer par activité" }).click();
    await page.getByRole("option", { name: "Toutes les activités" }).click();
    await expect(lignes).toHaveCount(5);

    await bureau.getByRole("searchbox", { name: "Rechercher une commission" }).fill("BE7955");
    await expect(lignes).toHaveCount(1);
    expect(requetes.at(-1)?.get("recherche")).toBe("BE7955");
    expect(requetes.at(-1)?.has("activite")).toBe(false);

    await bureau.getByRole("searchbox", { name: "Rechercher une commission" }).fill("inconnu");
    await expect(bureau.getByText("Aucune commission ne correspond à cette recherche.")).toBeVisible();
  });

  test("le filtre véhicule propose le véhicule parrainé avec la nature du lien", async ({ page }) => {
    await loginMulti(page);
    const requetes = requetesCommissions(page);
    await page.goto("/espace-client/commissions");
    const bureau = page.locator(".client-desktop-expenses");
    await expect(bureau.getByTestId("commission-ligne")).toHaveCount(5, { timeout: 20_000 });

    // Année et mois de la période comptable, puis Période, puis Véhicule.
    await bureau.getByRole("combobox").nth(3).click();
    await expect(page.getByRole("option", { name: "KALOUM · BE8120 (Livreur)" })).toBeVisible();
    await page.getByRole("option", { name: "MATOTO · BE7955 (Parrain)" }).click();

    await expect(bureau.getByTestId("commission-ligne")).toHaveCount(1);
    expect(requetes.at(-1)?.get("vehicule_id")).toBe("veh-c");
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

  test("un compte à une seule activité n'a pas de répartition mais garde le badge", async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page.locator(".client-desktop-dashboard").getByText(/Commission générée/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("repartition-activites")).toHaveCount(0);

    await page.goto("/espace-client/commissions");
    const lignes = page.locator(".client-desktop-expenses").getByTestId("commission-ligne");
    await expect(lignes).toHaveCount(2, { timeout: 20_000 });
    await expect(lignes.locator('[data-activite="proprietaire"]')).toHaveCount(2);
    await expect(page.locator(".client-desktop-expenses").getByRole("combobox", { name: "Filtrer par activité" })).toHaveCount(0);
  });
});
