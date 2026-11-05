import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Espace parrain contre mock-backend.mjs : un parrain seul (601020399) et un
// propriétaire également parrain (601020398). Le contrôle d'accès réel est testé
// côté elm-monolithe (tests/Feature/Api/Parrain) : ici, les écrans et les menus.
async function loginWith(page: Page, telephoneLocal: string, waitFor: RegExp): Promise<void> {
  await page.goto("/connexion", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(2000);
  await page.getByLabel("Numéro de téléphone").fill(telephoneLocal);
  await page.getByPlaceholder("••••••••").fill("MotDePasse123");
  // Réessayé : au tout premier passage, Vite compile encore et le clic peut
  // précéder l'hydratation (voir le commentaire de playwright.config.ts).
  await expect(async () => {
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await page.waitForURL(waitFor, { timeout: 10_000 });
  }).toPass({ timeout: 45_000 });
}

const loginParrainSeul = (page: Page) => loginWith(page, "601020399", /\/espace-client\/parrain$/);
const loginCumul = (page: Page) => loginWith(page, "601020398", /\/espace-client$/);

test.describe("Espace parrain", () => {
  test.describe.configure({ timeout: 90_000 });

  test("un parrain seul arrive sur son accueil, avec ses montants et son menu", async ({ page }) => {
    await loginParrainSeul(page);

    await expect(page).toHaveTitle(/Espace parrain/);
    await expect(page.locator(".client-desktop-dashboard").getByText(/450\s000 GNF/)).toBeVisible();
    const menu = page.locator(".layout-menu");
    await expect(menu.getByRole("link", { name: "Synthèse" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Véhicules parrainés" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Mon profil" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Dépenses" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Livraisons" })).toHaveCount(0);
  });

  test("un parrain seul a sa barre mobile partout, profil compris", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginParrainSeul(page);

    const items = page.locator(".client-mobile-bottom-nav .client-mobile-nav-item");
    await expect(items).toHaveText(["Accueil", "Véhicules", "Commissions", "Paiements", "Profil"], { timeout: 20_000 });

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/espace-client\/profil$/);
    await expect(items).toHaveCount(5);
    await expect(items.first()).toHaveAttribute("href", "/espace-client/parrain");
  });

  test("le tableau de bord classique renvoie un parrain seul vers son espace", async ({ page }) => {
    await loginParrainSeul(page);

    await page.goto("/espace-client");
    await expect(page).toHaveURL(/\/espace-client\/parrain$/);
  });

  test("les véhicules affichent ses parts, et « à définir » plutôt que 0 GNF", async ({ page }) => {
    await loginParrainSeul(page);

    await page.locator(".layout-menu").getByRole("link", { name: "Véhicules parrainés" }).click();
    await expect(page).toHaveURL(/\/parrain\/vehicules$/);
    const table = page.locator(".client-desktop-expenses");
    await expect(table.getByText("Camion Parrain")).toBeVisible();
    await expect(table.getByText("200 GNF par pack")).toBeVisible();
    await expect(table.getByText("à définir", { exact: true })).toBeVisible();
  });

  test("les commissions se filtrent et le résumé suit le backend", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginParrainSeul(page);

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Commissions" }).click();
    await expect(page).toHaveURL(/\/parrain\/commissions$/);
    const cards = page.getByTestId("parrain-commission");
    await expect(cards).toHaveCount(3);
    await expect(page.getByTestId("parrain-reste-a-payer")).toHaveText(/300\s000 GNF/);
    await expect(page.locator(".client-mobile-expenses").getByLabel("Filtrer par statut")).toHaveText("Tous les statuts");

    await page.locator(".client-mobile-expenses").getByLabel("Filtrer par statut").click();
    await page.getByRole("option", { name: "Payée", exact: true }).click();
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId("parrain-reste-a-payer")).toHaveText(/^0 GNF$/);
  });

  test("un lien de véhicule pré-filtre les commissions", async ({ page }) => {
    await loginParrainSeul(page);

    await page.goto("/espace-client/parrain/commissions?vehicule_id=veh-parrain-2");
    await expect(page.locator(".client-desktop-expenses").getByText("Tricycle Parrain").first()).toBeVisible();
    await expect(page.locator(".client-desktop-expenses").getByText("Camion Parrain")).toHaveCount(0);
  });

  test("les paiements affichent le mode en clair", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginParrainSeul(page);

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Paiements" }).click();
    await expect(page.getByTestId("parrain-paiement")).toHaveCount(1);
    await expect(page.getByTestId("parrain-paiement").getByText("Espèces")).toBeVisible();
  });

  test("un compte détaché en cours de session voit un message, sans être déconnecté", async ({ page }) => {
    await loginParrainSeul(page);

    await page.route("**/api/client/parrain/**", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Aucun parrain n'est rattaché à ce compte." }) }));

    await page.locator(".layout-menu").getByRole("link", { name: "Mes paiements" }).click();
    await expect(page.locator(".client-desktop-expenses").getByText("n'est plus rattaché")).toBeVisible();
    await expect(page).toHaveURL(/\/espace-client\//);
  });

  test("propriétaire et parrain : son menu ne change pas, l'accueil n'a pas de carte vers l'espace parrain", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginCumul(page);

    const items = page.locator(".client-mobile-bottom-nav .client-mobile-nav-item");
    await expect(items).toHaveText(["Accueil", "Véhicules", "Livraisons", "Commissions", "Dépenses"], { timeout: 20_000 });
    await expect(page.locator(".client-mobile-dashboard").getByText("Mes parrainages")).toHaveCount(0);

    await page.goto("/espace-client/parrain");
    await expect(page).toHaveURL(/\/espace-client\/parrain$/);
    await expect(items).toHaveText(["Accueil", "Véhicules", "Commissions", "Paiements", "Mon espace"]);

    await page.locator(".client-mobile-bottom-nav").getByRole("link", { name: "Mon espace" }).click();
    await expect(page).toHaveURL(/\/espace-client$/);
    await expect(items).toHaveText(["Accueil", "Véhicules", "Livraisons", "Commissions", "Dépenses"]);
  });

  test("propriétaire et parrain : le menu latéral sépare les deux activités", async ({ page }) => {
    await loginCumul(page);

    const menu = page.locator(".layout-menu");
    await expect(menu.getByText("Espace parrain")).toBeVisible();
    await expect(menu.getByRole("link", { name: "Mes commissions" })).toBeVisible();
    // Le nom accessible commence par le glyphe de l'icône.
    await expect(menu.getByRole("link", { name: /\sCommissions$/ })).toBeVisible();
  });

  test("un compte sans parrain ne voit rien de cet espace et y est renvoyé", async ({ page }) => {
    await loginAsTestUser(page);

    await expect(page.locator(".layout-menu").getByText("Espace parrain")).toHaveCount(0);

    await page.goto("/espace-client/parrain");
    await expect(page).toHaveURL(/\/espace-client$/);
  });
});
