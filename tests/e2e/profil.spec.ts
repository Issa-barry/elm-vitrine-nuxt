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

  // Régression 02/11 : le panneau mobile affichait "Issa M." pour tous les comptes.
  test("le panneau de profil mobile affiche le compte connecté", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Ouvrir mon profil et mes paramètres" }).click();

    const panel = page.locator(".client-mobile-profile-identity-info");
    await expect(panel.getByText("Test E2E", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText("Propriétaire", { exact: true })).toBeVisible();
    await expect(panel.getByText("+224 601 02 03 04", { exact: true })).toBeVisible();
    await expect(page.getByText("Issa M.")).toHaveCount(0);
    await expect(page.getByText("+224 622 60 26 93")).toHaveCount(0);
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

  test("modifie le prénom et le nom réellement, le téléphone reste verrouillé", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const enregistrer = page.getByRole("button", { name: "Enregistrer mes informations" });
    await expect(enregistrer).toBeDisabled();
    await expect(page.getByLabel("Téléphone")).not.toBeEditable();

    await page.getByLabel("Prénom").fill("Testé");
    await enregistrer.click();
    await expect(page.getByText("Informations mises à jour.")).toBeVisible();
    await expect(page.getByRole("main").getByText("Testé E2E", { exact: true })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await expect(page.getByLabel("Prénom")).toHaveValue("Testé", { timeout: 10_000 });
    // La valeur vient du SSR : attendre l'hydratation avant de saisir.
    await page.waitForTimeout(1000);

    // État du mock partagé entre les tests de ce fichier : restauré ici.
    await page.getByLabel("Prénom").fill("Test");
    await enregistrer.click();
    await expect(page.getByText("Informations mises à jour.")).toBeVisible();
  });

  test("affiche les erreurs de validation sous le champ concerné", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByLabel("Adresse e-mail").fill("prise@example.com");
    await page.getByRole("button", { name: "Enregistrer mes informations" }).click();

    await expect(page.getByText("Cette adresse e-mail est déjà utilisée.")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("prise@example.com");
  });

  test("un nouvel e-mail attend la confirmation par lien", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByLabel("Adresse e-mail").fill("nouvelle@example.com");
    await page.getByRole("button", { name: "Enregistrer mes informations" }).click();

    await expect(page.getByText(/Un lien de confirmation a été envoyé à nouvelle@example\.com/)).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("test-e2e@example.com");
  });

  test("avertit quand le lien de confirmation n'a pas pu être envoyé", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByLabel("Adresse e-mail").fill("smtp-ko@example.com");
    await page.getByRole("button", { name: "Enregistrer mes informations" }).click();

    await expect(page.getByText(/n'a pas pu être envoyé à smtp-ko@example\.com/)).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("test-e2e@example.com");
  });

  test("le pays se choisit dans une liste", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const pays = page.getByRole("combobox", { name: "Pays" });
    await expect(pays).toHaveText("Guinée", { timeout: 10_000 });

    await pays.click();
    await page.getByRole("option", { name: "Sénégal" }).click();
    await page.getByRole("button", { name: "Mettre à jour" }).click();
    await expect(page.getByText("Localisation mise à jour.")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await expect(page.getByRole("combobox", { name: "Pays" })).toHaveText("Sénégal", { timeout: 10_000 });
  });

  test("reste utilisable si l'API ne fournit pas la liste des pays", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.route("**/api/client/profile", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const response = await route.fetch();
      const body = await response.json();
      delete body.pays_disponibles;
      body.profile.localisation.pays = null;
      return route.fulfill({ response, json: body });
    });

    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByLabel("Ville")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("combobox", { name: "Pays" }).click();
    // getByRole : PrimeVue répète ce texte dans une zone d'accessibilité masquée.
    await expect(page.getByRole("option", { name: "Liste des pays indisponible pour le moment" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("l'identité reste modifiable si la fiche ne se charge pas", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsTestUser(page);
    await page.route("**/api/client/profile", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 500, json: { message: "Erreur serveur." } })
        : route.fallback(),
    );

    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page.getByLabel("Prénom")).toHaveValue("Test", { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Mettre à jour" })).toHaveCount(0);
    await expect(page.locator(".card p.text-red-600")).toBeVisible();

    expect(errors).toEqual([]);
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
