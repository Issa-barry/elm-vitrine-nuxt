import { test, expect, type Page } from "@playwright/test";

// pages/connexion.vue appelle réellement POST /api/auth/login (server/api/
// auth/login.post.ts, notre propre route BFF — voir composables/useAuth.ts),
// y compris en `nuxt dev` : contrairement à inscription.vue/mot-de-passe-
// oublie.vue, cette page n'a plus de mode "preview" mocké côté composant.
// Comme ce dépôt n'a pas de backend Laravel garanti disponible en CI (voir
// playwright.config.ts), les tests "succès"/"échec" ci-dessous mockent la
// réponse réseau via page.route() plutôt que de dépendre d'un vrai backend —
// ils exercent donc le vrai code client (composables/useAuth.ts +
// pages/connexion.vue), pas un mock interne à la page.
//
// waitUntil: "domcontentloaded" puis un waitForLoadState("load") séparé :
// la navigation initiale ne doit pas attendre les ressources externes lentes
// (police fonts.cdnfonts.com, drapeaux flagcdn.com) sous peine de timeout,
// mais le clic sur un <button @click> (contrairement à un <NuxtLink>, qui a
// un fallback natif <a href>) exige que l'hydratation Vue soit terminée —
// d'où l'attente explicite de "load" avant toute interaction de formulaire.

// Réponse exacte de server/api/auth/me.get.ts en succès (pass-through de
// GET /api/auth/me côté Laravel, voir docs/api-auth-contract.md).
const mockMeResponse = {
  id: "user-1",
  prenom: "Test",
  nom: "E2E",
  telephone: "+224601020304",
  email: "test@example.com",
  roles: ["client"],
  is_active: true,
  qr_payload: null,
  context: { organization_id: "org-1", client_id: "client-1", proprietaire_id: null, livreur_id: null },
};

async function fillCredentials(page: Page) {
  await page.getByLabel("Numéro de téléphone").fill("601020304");
  await page.getByPlaceholder("••••••••").fill("MotDePasse123");
}

async function mockLoginSuccess(page: Page, roles: string[]) {
  const meResponse = { ...mockMeResponse, roles };
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: meResponse }) }),
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(meResponse) }),
  );
}

test.describe("Connexion", () => {
  test("affiche une erreur de validation si le formulaire est vide", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(page.locator(".connexion-error").first()).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("connexion réussie (POST /api/auth/login mocké) redirige vers /espace-client", async ({ page }) => {
    await mockLoginSuccess(page, ["client"]);

    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await fillCredentials(page);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
  });

  // Contrat exact de LoginController côté backend pour des identifiants
  // incorrects (voir docs/api-auth-contract.md côté elm-monolithe et
  // config/auth.test.ts pour le déballage de ce format).
  test("identifiants incorrects (422 mocké) affiche le message d'erreur sans rediriger", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Les identifiants fournis sont incorrects.",
          errors: { telephone: ["Les identifiants fournis sont incorrects."] },
        }),
      }),
    );

    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await fillCredentials(page);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page.getByText("Les identifiants fournis sont incorrects.")).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  // Un compte staff/admin/super_admin obtient un token Sanctum valide comme
  // n'importe qui (LoginController ne vérifie aucun rôle, partagé avec le
  // mobile) — c'est au frontend de refuser explicitement l'accès à cet
  // espace, qui n'est pas l'application backoffice. Voir
  // composables/useAuth.ts::login() et config/auth.test.ts pour la règle.
  test("compte sans rôle client/proprietaire/livreur (ex. admin) est refusé sans rediriger", async ({ page }) => {
    let logoutCalled = false;

    await mockLoginSuccess(page, ["admin"]);
    await page.route("**/api/auth/logout", (route) => {
      logoutCalled = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "ok" }) });
    });

    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await fillCredentials(page);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page.getByText("Ce compte n'a pas accès à l'espace client.")).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
    expect(logoutCalled).toBe(true);
  });

  // Matrice de cumul de rôles confirmée côté backend le 26/08/2026 (117/117
  // tests, App\Models\User::hasBackofficeAccess()/hasClientAccess()) : couche
  // exhaustivement en unitaire dans config/auth.test.ts (hasClientSpaceAccess).
  // Ici, seulement 2 cas représentatifs pour prouver le branchement bout en
  // bout via la vraie UI — pas une répétition de la matrice complète en E2E.
  test("compte propriétaire seul est accepté", async ({ page }) => {
    await mockLoginSuccess(page, ["proprietaire"]);

    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await fillCredentials(page);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
  });

  test("compte cumulant un rôle staff et un rôle espace client (ex. admin_entreprise + proprietaire) est accepté", async ({ page }) => {
    await mockLoginSuccess(page, ["admin_entreprise", "proprietaire"]);

    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);

    await fillCredentials(page);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page).toHaveURL(/\/espace-client$/, { timeout: 10_000 });
  });

  test("le lien mot de passe oublié mène à /mot-de-passe-oublie", async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page).toHaveURL(/\/mot-de-passe-oublie$/);
  });
});
