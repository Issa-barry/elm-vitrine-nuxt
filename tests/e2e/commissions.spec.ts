import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/commissions.vue, branché sur
// GET /v1/mobile/vehicules/{id}/commissions (un appel par véhicule, fusionné
// — voir composables/useClientCommissions.ts, mock-backend.mjs::
// TEST_COMMISSIONS_BY_VEHICULE : veh-1 a 2 commissions, veh-2 en a 1).
test.describe("Espace client — commissions", () => {
  test.describe.configure({ timeout: 90_000 });

  test("le lien Commissions du menu bas (mobile) ouvre la page avec les vraies données", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    await page.getByRole("link", { name: "Commissions" }).click();
    await expect(page).toHaveURL(/\/espace-client\/commissions$/);
    await expect(page).toHaveTitle(/Mes commissions/);

    // Scopé à .client-mobile-expenses : la section desktop (masquée en CSS à
    // cette largeur, pas retirée du DOM) répète les mêmes montants ailleurs
    // sur la page, ce qui viole le mode strict de Playwright sans ce scope
    // (voir le même correctif appliqué à dashboard-kpi.spec.ts).
    const mobile = page.locator(".client-mobile-expenses");
    // Reste à payer réel : 0 (comm-1, payée) + 22 000 (comm-2, partielle) + 38 000 (comm-3) = 60 000.
    await expect(mobile.getByText(`${new Intl.NumberFormat("fr-FR").format(60_000)} GNF`)).toBeVisible({ timeout: 10_000 });
    await expect(mobile.getByText("CMD-2847")).toBeVisible();
    await expect(mobile.getByText("CMD-2820")).toBeVisible();
    await expect(mobile.getByText("CMD-2839")).toBeVisible();
  });

  test("affiche les totaux réels et filtre par véhicule (desktop)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const desktop = page.locator(".client-desktop-expenses");
    // Montant net total : 50 000 + 42 000 + 38 000 = 130 000.
    await expect(desktop.getByText(`${new Intl.NumberFormat("fr-FR").format(130_000)} GNF`)).toBeVisible({ timeout: 10_000 });

    await desktop.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /ABARRY 2/ }).click();

    await expect(desktop.getByText("CMD-2839")).toBeVisible();
    await expect(desktop.getByText("CMD-2847")).toHaveCount(0);
  });
});
