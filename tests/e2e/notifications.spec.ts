import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre le "centre de notifications" du header (chantier du 27/08/2026) :
// cloche desktop/tablette (ClientTopbar.vue, panneau ClientNotificationsPanel.vue)
// et cloche mobile (ClientMobileTopbar.vue -> page plein écran
// pages/espace-client/notifications.vue).
//
// GET /api/client/notifications est intercepté avec un jeu de données fixe
// dans CHAQUE test (mêmes 3 notifications que
// tests/e2e/mock-backend.mjs::TEST_NOTIFICATIONS, dont notif-2 porte un
// `commande_id` correspondant à un vrai item TEST_ACTIVITY) plutôt que de
// dépendre du mock backend réel : celui-ci garde un état MUTABLE en mémoire
// pour toute la durée du run (un seul worker, un seul process), donc un test
// qui appelle réellement mark-all-read changerait l'état lu/non-lue vu par
// les tests suivants du fichier — même les POST mark-read/mark-all-read
// restent réels ici (mutent tests/e2e/mock-backend.mjs, sans conséquence
// puisque plus aucun test ne dépend d'un GET non intercepté après celui-ci).
const NOTIFICATIONS_FIXTURE = {
  data: [
    { id: "notif-1", type: "commande_validee", titre: "Livraison CMD-2841 terminée", message: "12 packs livrés aujourd'hui", data: {}, lu: false, created_at: "2026-08-26T10:00:00.000000Z" },
    { id: "notif-2", type: "commande_validee", titre: "Nouvelle commande attribuée", message: "Commande CMD-2847", data: { commande_id: "act-1", reference: "CMD-2847" }, lu: false, created_at: "2026-08-25T15:30:00.000000Z" },
    { id: "notif-3", type: "versement", titre: "Versement validé", message: "Montant de 850 000 GNF", data: {}, lu: true, created_at: "2026-08-24T09:12:00.000000Z" },
  ],
  unread_count: 2,
};

async function mockNotifications(page: Page, fixture: unknown = NOTIFICATIONS_FIXTURE) {
  await page.route("**/api/client/notifications", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(fixture),
  }));
}

test.describe("Espace client — centre de notifications", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop : la cloche affiche le badge de non-lues réel, indépendant de Profil", async ({ page }) => {
    await mockNotifications(page);
    await loginAsTestUser(page);

    const bell = page.getByRole("button", { name: "Notifications, 2 non lues" });
    await expect(bell).toBeVisible({ timeout: 10_000 });
    await expect(bell.getByText("2", { exact: true })).toBeVisible();
  });

  test("desktop : ouvrir la cloche affiche les notifications réelles, non-lues mises en évidence", async ({ page }) => {
    await mockNotifications(page);
    await loginAsTestUser(page);

    await page.getByRole("button", { name: "Notifications, 2 non lues" }).click();

    const panel = page.locator("section[aria-label='Notifications']");
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText("Livraison CMD-2841 terminée")).toBeVisible();
    await expect(panel.getByText("Nouvelle commande attribuée")).toBeVisible();
    await expect(panel.getByText("Versement validé")).toBeVisible();
    // Jamais l'unique moyen de distinguer lu/non lu (demande du 27/08/2026,
    // section 11) : le statut est aussi porté par un texte accessible dédié.
    await expect(panel.getByText("Non lue")).toHaveCount(2);
    await expect(panel.getByText("Lue", { exact: true })).toHaveCount(1);
  });

  test("desktop : \"Tout marquer comme lu\" vide le badge immédiatement (sans rechargement complet)", async ({ page }) => {
    await mockNotifications(page);
    await loginAsTestUser(page);

    // L'ouverture du panneau déclenche elle-même un rafraîchissement
    // silencieux (demande du 27/08/2026, section 7, voir onMounted() de
    // ClientNotificationsPanel.vue) : on attend sa résolution avant d'agir,
    // pour ne pas laisser cette 2e réponse GET (même fixture, mais résolue
    // après coup) écraser la mise à jour optimiste du clic qui suit.
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/client/notifications") && response.request().method() === "GET"),
      page.getByRole("button", { name: "Notifications, 2 non lues" }).click(),
    ]);
    const panel = page.locator("section[aria-label='Notifications']");
    await panel.getByRole("button", { name: "Tout marquer comme lu" }).click();

    await expect(panel.getByText("Non lue")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Notifications, aucune non lue" })).toBeVisible();
  });

  test("desktop : une notification \"commande_validee\" exploitable redirige vers Livraisons et ouvre le bon détail", async ({ page }) => {
    await mockNotifications(page);
    await loginAsTestUser(page);

    // Même remarque que le test "Tout marquer comme lu" ci-dessus.
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/client/notifications") && response.request().method() === "GET"),
      page.getByRole("button", { name: "Notifications, 2 non lues" }).click(),
    ]);
    const panel = page.locator("section[aria-label='Notifications']");
    await panel.getByText("Nouvelle commande attribuée").click();

    await expect(page).toHaveURL(/\/espace-client\/activite\?commande=act-1$/);
    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    // "CMD-2847" apparaît deux fois par design (légende sous le QR + en-tête
    // de détail) : même remarque que tests/e2e/vehicules.spec.ts, on vérifie
    // l'en-tête dédié.
    await expect(detail.locator(".client-delivery-detail__top").getByText("CMD-2847")).toBeVisible();

    // Marquée lue au clic (optimiste) : le badge passe de 2 à 1 non lue.
    await expect(page.getByRole("button", { name: "Notifications, 1 non lue" })).toBeVisible();
  });

  test("desktop : état vide sobre quand il n'y a aucune notification", async ({ page }) => {
    await mockNotifications(page, { data: [], unread_count: 0 });
    await loginAsTestUser(page);

    await page.getByRole("button", { name: "Notifications, aucune non lue" }).click();

    const panel = page.locator("section[aria-label='Notifications']");
    await expect(panel.getByText("Vous êtes à jour")).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole("button", { name: "Tout marquer comme lu" })).toBeDisabled();
  });

  test("mobile : la cloche du tableau de bord ouvre la page Notifications plein écran, jamais un dropdown", async ({ page }) => {
    await mockNotifications(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    const bell = page.getByRole("link", { name: "Notifications, 2 non lues" });
    await expect(bell).toBeVisible({ timeout: 10_000 });

    // La page déclenche elle-même un rafraîchissement silencieux à
    // l'ouverture (section 7, voir son onMounted()) : écouteur posé avant le
    // clic qui déclenche la navigation, même remarque que les tests desktop
    // ci-dessus.
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/client/notifications") && response.request().method() === "GET"),
      bell.click(),
    ]);

    await expect(page).toHaveURL(/\/espace-client\/notifications$/);
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible({ timeout: 10_000 });
    // Scopé à la section mobile : .client-desktop-notifications (repli
    // desktop de la même page, masqué en CSS à cette largeur) reste dans le
    // DOM et affiche les mêmes données — getByText n'exclut pas les
    // éléments display:none, contrairement à getByRole.
    const mobileSection = page.locator(".client-mobile-notifications");
    await expect(mobileSection.getByText("Nouvelle commande attribuée")).toBeVisible();

    await page.getByRole("button", { name: "Tout lu" }).click();
    await expect(mobileSection.getByText("Non lue")).toHaveCount(0);

    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page).toHaveURL(/\/espace-client$/);
  });
});
