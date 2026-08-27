import { test, expect } from "@playwright/test";

// Couvre pages/dev-preview/espace-client/{index,[scenario]}.vue — preview UI
// des capacités espace client (chantier "prestataire" du 27/08/2026, voir
// config/clientCapabilities.ts). Indépendant de l'auth réelle : pas de
// loginAsTestUser() ici, ces routes ne passent par aucun middleware "auth"
// ni composable useAuth() (voir composables/useClientCapabilities.ts).
test.describe("Preview UI — capacités espace client (dev uniquement)", () => {
  test("l'index liste les 4 scénarios", async ({ page }) => {
    await page.goto("/dev-preview/espace-client", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Prestataire seul")).toBeVisible();
    await expect(page.getByText("Client + Prestataire")).toBeVisible();
    // exact: true — "Propriétaire + Prestataire" est une sous-chaîne de
    // "Client + Propriétaire + Prestataire", collision sans ça.
    await expect(page.getByText("Propriétaire + Prestataire", { exact: true })).toBeVisible();
    await expect(page.getByText("Client + Propriétaire + Prestataire")).toBeVisible();
  });

  test("scénario inconnu -> 404, pas une page à moitié vide", async ({ page }) => {
    const response = await page.goto("/dev-preview/espace-client/inconnu", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(404);
  });

  test("prestataire seul : commissions/dépenses/prestations/profil visibles, jamais véhicules/activité", async ({ page }) => {
    await page.goto("/dev-preview/espace-client/prestataire-seul", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator(".layout-menu");
    await expect(sidebar.getByRole("link", { name: "Commissions" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Dépenses" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Prestations" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Mon profil" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Véhicules" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Livraisons" })).toHaveCount(0);

    // Checklist "Capacités résolues" — couvre aussi "orders" (pas d'entrée de
    // menu du tout aujourd'hui, voir config/clientNavigation.ts) via son état
    // "Masqué" explicite, plutôt que juste l'absence d'un lien.
    const checklist = page.locator(".client-desktop-expenses");
    await expect(checklist.getByText("Mes commandes")).toBeVisible();
    await expect(checklist.getByText("(pas encore d'entrée de menu)")).toBeVisible();
  });

  test("client + prestataire : ajoute Mes commandes dans la checklist (Visible)", async ({ page }) => {
    await page.goto("/dev-preview/espace-client/client-prestataire", { waitUntil: "domcontentloaded" });
    const sidebar = page.locator(".layout-menu");
    await expect(sidebar.getByRole("link", { name: "Véhicules" })).toHaveCount(0);

    const ordersRow = page.locator(".client-desktop-expenses").getByText("Mes commandes").locator("xpath=ancestor::li[1]");
    await expect(ordersRow.getByText("Visible", { exact: true })).toBeVisible();
  });

  test("propriétaire + prestataire : ajoute Véhicules/Activité, sans Mes commandes", async ({ page }) => {
    await page.goto("/dev-preview/espace-client/proprietaire-prestataire", { waitUntil: "domcontentloaded" });
    const sidebar = page.locator(".layout-menu");
    await expect(sidebar.getByRole("link", { name: "Véhicules" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Livraisons" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Prestations" })).toBeVisible();

    const ordersRow = page.locator(".client-desktop-expenses").getByText("Mes commandes").locator("xpath=ancestor::li[1]");
    await expect(ordersRow.getByText("Masqué", { exact: true })).toBeVisible();
  });

  test("client + propriétaire + prestataire : tout est visible dans le menu", async ({ page }) => {
    await page.goto("/dev-preview/espace-client/client-proprietaire-prestataire", { waitUntil: "domcontentloaded" });
    const sidebar = page.locator(".layout-menu");
    await expect(sidebar.getByRole("link", { name: "Véhicules" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Livraisons" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Commissions" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Dépenses" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Prestations" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Mon profil" })).toBeVisible();
  });
});
