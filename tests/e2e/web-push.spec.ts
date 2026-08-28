import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Ces tests tournent contre `nuxt dev` (service worker désactivé, voir
// tests/e2e/pwa.spec.ts) : impossible d'y exercer un VRAI
// PushManager.subscribe() (aucun service worker enregistré, `navigator.
// serviceWorker.ready` ne se résoudrait jamais). Se limite donc, comme
// documenté section 41 du chantier Web Push (docs/pwa.md § Web Push), aux
// états UI que Playwright peut simuler proprement SANS jamais accorder la
// permission "notifications" au contexte (ce qui ferait passer
// composables/useWebPush.ts::initialize() par syncSubscription() ->
// navigator.serviceWorker.ready, qui resterait bloqué en dev). Le reste
// (VAPID null, permission denied, abonnement réel, resync, logout) est
// couvert par config/webPush.test.ts (logique pure) et une vérification
// manuelle contre un vrai build (docs/pwa.md § Vérifications effectuées).
test.describe("Espace client — Notifications sur cet appareil (Web Push)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("n'affiche jamais le prompt de permission automatiquement au chargement", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Notification.requestPermission() n'a jamais été appelé au montage
    // (section 17) : la permission ne doit JAMAIS passer à "granted" sans
    // interaction explicite. Pas d'assertion sur la valeur exacte de repos
    // ("default" vs "denied") : Chromium/Playwright bloque les notifications
    // par défaut pour tout contexte fraîchement créé sans
    // context.grantPermissions(["notifications"]) — comportement du
    // navigateur, pas de l'application (vérifié empiriquement, voir
    // docs/pwa.md § Web Push).
    const permission = await page.evaluate(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
    expect(permission).not.toBe("granted");
  });

  test("affiche la carte 'Bloquées par le navigateur' quand la permission est refusée (défaut Chromium/Playwright)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Titre de la carte — distinct de la carte "Notifications" existante
    // (préférence backend/globale au compte), voir section 19-20 du chantier.
    await expect(page.getByText("Notifications sur cet appareil")).toBeVisible({ timeout: 10_000 });
    // Chromium/Playwright renvoie "denied" par défaut pour tout contexte sans
    // permission explicitement accordée (voir test précédent) : exerce donc
    // réellement l'état permission_denied de bout en bout (voir
    // config/webPush.ts::resolveWebPushState), pas un état "not_subscribed"
    // qui nécessiterait de forcer une permission jamais accordée par défaut.
    await expect(page.getByText("Bloquées par le navigateur", { exact: true })).toBeVisible();
    // Aucun bouton "Activer" tant que le navigateur bloque lui-même : section
    // 25, ne jamais proposer un bouton qui échouerait silencieusement.
    await expect(page.getByRole("button", { name: "Activer" })).toHaveCount(0);
  });
});
