import { test, expect } from "@playwright/test";

test.describe("Espace client — profil", () => {
  test("affiche les informations personnelles", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Mon profil/);
    await expect(page.getByText("Informations personnelles")).toBeVisible();

    expect(errors).toEqual([]);
  });

  // "Se déconnecter" appelle useAuth().logout() (composables/useAuth.ts), qui
  // n'effectue aucun appel réseau en `nuxt dev` (voir son commentaire) mais
  // vide bien l'état local et redirige — ce que ce test vérifie réellement.
  test("le bouton Se déconnecter redirige vers /connexion", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/espace-client/profil", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    // Un clic sur un <button @click> (contrairement à un <NuxtLink>, qui a un
    // fallback natif <a href>) exige que l'hydratation Vue soit terminée.
    // 300ms suffit sur pages/connexion.vue (layout léger, voir
    // connexion.spec.ts) mais pas ici : layouts/client.vue charge en plus
    // sidebar/topbar/plusieurs composants PrimeVue (Avatar, Select,
    // ToggleSwitch...), dont l'hydratation complète a été mesurée nettement
    // plus lente en pratique sur cette page précise (mesuré flaky à 300ms et
    // 1000ms, fiable à 2000ms sur cette machine).
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Se déconnecter" }).click();

    await expect(page).toHaveURL(/\/connexion$/, { timeout: 10_000 });
    expect(errors).toEqual([]);
  });
});
