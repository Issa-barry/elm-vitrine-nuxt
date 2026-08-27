import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre components/landing/Navbar.vue après le chantier "header auth" du
// 27/08/2026 : le header public reflète la session déjà connue (BFF Nuxt,
// useAuth() partagé, middleware/session.global.ts) — jamais un deuxième
// système d'auth, jamais un flash Connexion/Inscription -> Mon espace.
test.describe("Vitrine — header selon l'état d'authentification", () => {
  test("visiteur non connecté : Connexion/Inscription, pas \"Mon espace\"", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Connexion" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Inscription" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Mon espace" })).toHaveCount(0);
  });

  test("utilisateur connecté : \"Mon espace\", jamais Connexion/Inscription", async ({ page }) => {
    await loginAsTestUser(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Mon espace" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Connexion" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Inscription" })).toHaveCount(0);
  });

  test("\"Mon espace\" redirige vers /espace-client", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Mon espace" }).first().click();
    await expect(page).toHaveURL(/\/espace-client$/);
  });

  test("login puis navigation vers la vitrine : le header considère immédiatement l'utilisateur authentifié", async ({ page }) => {
    await loginAsTestUser(page);
    // Navigation client-side (pas un rechargement) depuis l'espace client
    // vers la vitrine, via le lien du menu déjà testé ailleurs
    // (espace-client-navigation.spec.ts) — même useAuth() partagé, aucun
    // nouvel appel /me nécessaire (voir middleware/session.global.ts).
    await page.locator(".layout-menu").getByRole("link", { name: "Retour au site" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Mon espace" }).first()).toBeVisible({ timeout: 2_000 });
  });

  test("logout puis retour à la vitrine : Connexion/Inscription réapparaissent", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    // Délai d'hydratation — même besoin déjà documenté dans profil.spec.ts
    // (un clic trop tôt échoue silencieusement avant que le @click de Vue ne
    // soit attaché).
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/connexion$/, { timeout: 10_000 });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Connexion" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Inscription" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Mon espace" })).toHaveCount(0);
  });

  test("session lente : la vitrine n'affiche jamais Connexion en premier pour un utilisateur déjà connecté", async ({ page }) => {
    await loginAsTestUser(page);

    // Ralentit /api/auth/me pour cette navigation précise — même session
    // réelle (cookie déjà valide), seule la résolution est retardée. Le
    // middleware global bloque le rendu de la page jusqu'à résolution (voir
    // middleware/session.global.ts) : à aucun moment un état "invité" ne
    // doit apparaître puis être remplacé.
    await page.route("**/api/auth/me", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Mon espace" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Connexion" })).toHaveCount(0);
  });

  test("menu mobile : même logique que le header desktop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Bouton hamburger : nom accessible dérivé du <title>Menu</title> SVG
    // interne (voir components/landing/Navbar.vue), pas d'aria-label dédié.
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("link", { name: "Mon espace" }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Connexion" })).toHaveCount(0);
  });
});
