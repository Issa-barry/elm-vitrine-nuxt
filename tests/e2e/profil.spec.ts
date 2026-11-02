import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

test.describe("Espace client — profil", () => {
  // 90s : ces tests enchaînent loginAsTestUser() (jusqu'à ~30s de navigation
  // à froid) + un goto vers /espace-client/profil (jusqu'à 30s de plus, voir
  // son commentaire) + les interactions elles-mêmes — le timeout global de
  // 45s (playwright.config.ts) est trop juste pour ce cumul dans le pire cas.
  test.describe.configure({ timeout: 90_000 });

  test("affiche les vraies données du compte connecté (pas de mock)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page).toHaveTitle(/Mon profil/, { timeout: 10_000 });

    // Identité réelle (GET /api/auth/me, mock-backend.mjs::TEST_USER) —
    // jamais "Issa M." (ancienne donnée de démonstration, supprimée).
    await expect(page.getByRole("main").getByText("Test E2E", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Prénom")).toHaveValue("Test");
    // exact: true — "Nom" sans cette option matche aussi le label "Prénom"
    // (sous-chaîne "nom" incluse), violant le mode strict de Playwright.
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("E2E");
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("test-e2e@example.com");
    // Téléphone formaté par utils/phone.ts (testé indépendamment) : jamais la
    // forme brute +224601020304.
    await expect(page.getByLabel("Téléphone")).toHaveValue("+224 601 02 03 04");

    // Localisation réelle (GET /v1/mobile/profile, mock-backend.mjs::profileState).
    await expect(page.getByLabel("Ville")).toHaveValue("Conakry");

    // Données de démonstration de l'ancien template : ne doivent plus jamais
    // apparaître.
    await expect(page.getByText("Transport IM")).toHaveCount(0);
    await expect(page.getByText("SIRET")).toHaveCount(0);
    await expect(page.getByText("Issa M.")).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("modifie la localisation réellement (PATCH /v1/mobile/profile)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByLabel("Ville")).toHaveValue("Conakry", { timeout: 10_000 });

    await page.getByLabel("Ville").fill("Kindia");
    await page.getByRole("button", { name: "Mettre à jour" }).click();

    await expect(page.getByText("Localisation mise à jour.")).toBeVisible();

    // Persistée réellement côté mock backend (pas juste un état local) : un
    // rechargement de la page doit retrouver la nouvelle valeur.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await expect(page.getByLabel("Ville")).toHaveValue("Kindia", { timeout: 10_000 });
  });

  test("bascule la préférence de notification réellement (PATCH .../notification-preferences)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const toggle = page.getByRole("switch");
    await expect(toggle).toBeChecked({ timeout: 10_000 });

    await toggle.click();
    await expect(toggle).not.toBeChecked();

    // Persistée réellement côté mock backend : un rechargement retrouve OFF,
    // pas ON (ce que ferait un simple état local jamais envoyé au backend).
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await expect(page.getByRole("switch")).not.toBeChecked({ timeout: 10_000 });
  });

  test("le bouton Se déconnecter redirige vers /connexion", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Se déconnecter" }).click();

    await expect(page).toHaveURL(/\/connexion$/, { timeout: 10_000 });

    // Session réellement détruite : /espace-client redevient inaccessible.
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page).toHaveURL(/\/connexion$/, { timeout: 10_000 });
  });
});
