import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Couvre pages/espace-client/activite.vue branché sur GET /v1/mobile/activite
// (mock-backend.mjs::TEST_ACTIVITY, 4 opérations : 2 vente, 2 logistique,
// réparties sur 2 véhicules) — jamais les anciens champs mockés sans
// équivalent backend (driverPhone, agence, créateur, détail produit/quantité,
// heure, montant total), voir le commentaire de suppression dans
// pages/espace-client/activite.vue.
test.describe("Espace client — activité", () => {
  test.describe.configure({ timeout: 90_000 });

  test("affiche les vraies opérations (ventes et logistique mélangées)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await expect(page).toHaveTitle(/Activité/);

    const table = page.locator(".client-desktop-deliveries");
    await expect(table.getByText("CMD-2847")).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText("CMD-2839")).toBeVisible();
    await expect(table.getByText("TR-00042-XYZ")).toBeVisible();
    await expect(table.getByText("TR-00038-ABC")).toBeVisible();

    // Jamais les anciens champs de démonstration sans équivalent réel.
    await expect(page.getByText("Mamadou Camara")).toHaveCount(0);
    await expect(page.getByText("Agence principale")).toHaveCount(0);
  });

  test("filtre par type (vente/logistique)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const table = page.locator(".client-desktop-deliveries");
    await expect(table.getByText("CMD-2847")).toBeVisible({ timeout: 10_000 });

    await table.getByRole("button", { name: "Filtres" }).click();
    // getByRole("combobox"), pas getByLabel : le PrimeVue Select ne rend pas
    // d'élément "labelable" natif sous le <label> englobant (span + div),
    // donc getByLabel ne lui associe pas de nom accessible (même raison que
    // tests/e2e/depenses.spec.ts). 1er des deux Select du formulaire = Type.
    await page.locator("#client-delivery-filter-form").getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Vente" }).click();
    await page.getByRole("button", { name: "Appliquer" }).click();

    await expect(table.getByText("CMD-2847")).toBeVisible();
    await expect(table.getByText("CMD-2839")).toBeVisible();
    await expect(table.getByText("TR-00042-XYZ")).toHaveCount(0);
    await expect(table.getByText("TR-00038-ABC")).toHaveCount(0);
  });

  test("ouvre le détail d'une opération avec les vrais champs (pas de produits inventés)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /CMD-2847/ }).click();

    const detail = page.locator(".client-delivery-detail");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail.getByText("Siège de Matoto")).toBeVisible();
    await expect(detail.getByText("Client X")).toBeVisible();
    await expect(detail.getByText("ABARRY · OU3859")).toBeVisible();
    await expect(detail.getByText("12")).toBeVisible();
  });

  // Réponses interceptées au niveau du BFF : le filtrage réel est testé côté
  // backend (ActiviteControllerTest), la transmission par le BFF dans
  // tests/server/activity.get.test.ts. Ici : ce que l'écran demande et affiche.
  test.describe("périodes rapides (mobile 440 px)", () => {
    const operation = (id: string, date = "2026-08-20") => ({
      id,
      type: "vente",
      reference: id,
      statut: "livree",
      statut_label: "Livrée",
      site_source: "Siège de Matoto",
      site_destination: "Client X",
      vehicule: { id: "veh-1", nom_vehicule: "ABARRY", immatriculation: "OU3859" },
      date,
      nb_packs: 12,
    });
    const reponse = (ids: string[], meta: { page?: number; last?: number; total?: number } = {}) => ({
      data: ids.map((id) => operation(id)),
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: meta.page ?? 1, last_page: meta.last ?? 1, per_page: 50, total: meta.total ?? ids.length },
      filters: {},
    });
    const PERIODES = ["Aujourd’hui", "Hier", "Cette semaine", "Semaine dernière", "Ce mois", "Mois dernier", "Cette année"];

    async function ouvrirActivite(page: Page, repondre: (query: URLSearchParams) => unknown | Promise<unknown>) {
      const requetes: URLSearchParams[] = [];
      await page.route("**/api/client/activity*", async (route) => {
        const query = new URL(route.request().url()).searchParams;
        requetes.push(query);
        const corps = await repondre(query);
        if (corps === null) {
          await route.fulfill({ status: 500, json: { message: "Erreur serveur" } });
          return;
        }
        await route.fulfill({ json: corps });
      });
      await page.setViewportSize({ width: 440, height: 956 });
      await loginAsTestUser(page);
      await page.goto("/espace-client/activite", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("load");
      await expect(page.locator(".client-mobile-deliveries").getByText(/opération/).first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(500);
      return requetes;
    }

    const ouvrirFiltre = (page: Page) => page.getByRole("button", { name: "Filtrer l’activité" }).click();
    const periodes = (page: Page) => page.getByRole("group", { name: "Période" });
    const liste = (page: Page) => page.locator(".client-mobile-deliveries");

    test("affiche les sept périodes dans le panneau, sans débordement à 440 px", async ({ page }) => {
      await ouvrirActivite(page, () => reponse(["VTE-1"]));
      await ouvrirFiltre(page);

      const boutons = periodes(page).getByRole("button");
      await expect(boutons).toHaveText(PERIODES);

      const debordement = await page.locator(".client-delivery-filter-drawer .p-drawer-content").evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(debordement).toBeLessThanOrEqual(0);
    });

    test("sélection unique, désélection par second appui", async ({ page }) => {
      await ouvrirActivite(page, () => reponse(["VTE-1"]));
      await ouvrirFiltre(page);

      const hier = periodes(page).getByRole("button", { name: "Hier" });
      const annee = periodes(page).getByRole("button", { name: "Cette année" });

      await hier.click();
      await expect(hier).toHaveAttribute("aria-pressed", "true");

      await annee.click();
      await expect(annee).toHaveAttribute("aria-pressed", "true");
      await expect(hier).toHaveAttribute("aria-pressed", "false");

      await annee.click();
      await expect(annee).toHaveAttribute("aria-pressed", "false");
    });

    test("transmet la période seulement à l'application, affiche le total et permet de revenir à tout", async ({ page }) => {
      const requetes = await ouvrirActivite(page, (query) =>
        query.get("periode") === "semaine_precedente" ? reponse(["VTE-SEMAINE"], { total: 1 }) : reponse(["VTE-1", "VTE-2"]),
      );
      const initial = requetes.length;

      await ouvrirFiltre(page);
      await periodes(page).getByRole("button", { name: "Semaine dernière" }).click();
      expect(requetes.length).toBe(initial);

      await page.getByRole("button", { name: "Appliquer" }).click();

      await expect(liste(page).getByRole("button", { name: /VTE-SEMAINE/ })).toBeVisible();
      await expect(liste(page).getByText("1 opération", { exact: true })).toBeVisible();
      await expect(liste(page).getByRole("button", { name: /VTE-1/ })).toHaveCount(0);
      expect(requetes.length).toBe(initial + 1);
      expect(requetes.at(-1)?.get("periode")).toBe("semaine_precedente");
      expect(requetes.at(-1)?.has("date_debut")).toBe(false);

      await liste(page).getByRole("button", { name: "Retirer le filtre Période : Semaine dernière" }).click();
      await expect(liste(page).getByRole("button", { name: /VTE-1/ })).toBeVisible();
      expect(requetes.at(-1)?.has("periode")).toBe(false);
    });

    test("se combine avec le type et ne relance rien si rien ne change", async ({ page }) => {
      const requetes = await ouvrirActivite(page, () => reponse(["VTE-1"]));

      await ouvrirFiltre(page);
      await page.locator("#client-delivery-filter-form").getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Vente" }).click();
      await periodes(page).getByRole("button", { name: "Ce mois" }).click();
      await page.getByRole("button", { name: "Appliquer" }).click();

      await expect.poll(() => requetes.at(-1)?.get("periode")).toBe("ce_mois");
      expect(requetes.at(-1)?.get("type")).toBe("vente");

      const avant = requetes.length;
      await ouvrirFiltre(page);
      await page.getByRole("button", { name: "Appliquer" }).click();
      await page.waitForTimeout(300);
      expect(requetes.length).toBe(avant);
    });

    test("une date précise et une période s'excluent", async ({ page }) => {
      const requetes = await ouvrirActivite(page, () => reponse(["VTE-1"]));

      await ouvrirFiltre(page);
      const hier = periodes(page).getByRole("button", { name: "Hier" });
      await hier.click();
      await page.locator(".client-delivery-filter__date").fill("2026-08-20");
      await expect(hier).toHaveAttribute("aria-pressed", "false");

      await hier.click();
      await expect(page.locator(".client-delivery-filter__date")).toHaveValue("");
      await page.getByRole("button", { name: "Appliquer" }).click();

      await expect.poll(() => requetes.at(-1)?.get("periode")).toBe("hier");
      expect(requetes.at(-1)?.has("date_debut")).toBe(false);
      expect(requetes.at(-1)?.has("date_fin")).toBe(false);
    });

    test("« Afficher plus » conserve la période et concatène la page suivante", async ({ page }) => {
      const requetes = await ouvrirActivite(page, (query) => {
        if (query.get("periode") !== "cette_annee") return reponse(["VTE-1"]);
        return query.get("page") === "2"
          ? reponse(["VTE-PAGE-2"], { page: 2, last: 2, total: 51 })
          : reponse(["VTE-PAGE-1"], { page: 1, last: 2, total: 51 });
      });

      await ouvrirFiltre(page);
      await periodes(page).getByRole("button", { name: "Cette année" }).click();
      await page.getByRole("button", { name: "Appliquer" }).click();

      await expect(liste(page).getByText("51 opérations", { exact: true })).toBeVisible();
      await liste(page).getByRole("button", { name: "Afficher plus" }).click();

      await expect(liste(page).getByRole("button", { name: /VTE-PAGE-2/ })).toBeVisible();
      await expect(liste(page).getByRole("button", { name: /VTE-PAGE-1/ })).toBeVisible();
      await expect(liste(page).getByRole("button", { name: "Afficher plus" })).toHaveCount(0);
      expect(requetes.at(-1)?.get("periode")).toBe("cette_annee");
      expect(requetes.at(-1)?.get("page")).toBe("2");
    });

    test("états chargement, vide et erreur avec nouvel essai", async ({ page }) => {
      let liberer: () => void = () => {};
      let mode: "normal" | "lent" | "vide" | "erreur" = "normal";
      await ouvrirActivite(page, async () => {
        if (mode === "lent") await new Promise<void>((resolve) => { liberer = resolve; });
        if (mode === "vide") return reponse([]);
        if (mode === "erreur") return null;
        return reponse(["VTE-1"]);
      });

      mode = "lent";
      await ouvrirFiltre(page);
      await periodes(page).getByRole("button", { name: "Hier" }).click();
      await page.getByRole("button", { name: "Appliquer" }).click();
      await expect(liste(page).getByText("Chargement de l’activité…")).toBeVisible();
      await expect(liste(page).getByRole("button", { name: /VTE-1/ })).toHaveCount(0);
      mode = "normal";
      liberer();
      await expect(liste(page).getByRole("button", { name: /VTE-1/ })).toBeVisible();

      mode = "vide";
      await ouvrirFiltre(page);
      await periodes(page).getByRole("button", { name: "Ce mois" }).click();
      await page.getByRole("button", { name: "Appliquer" }).click();
      await expect(liste(page).getByText("Aucune opération trouvée")).toBeVisible();
      await expect(liste(page).getByText("0 opération", { exact: true })).toBeVisible();

      mode = "erreur";
      await ouvrirFiltre(page);
      await periodes(page).getByRole("button", { name: "Hier" }).click();
      await page.getByRole("button", { name: "Appliquer" }).click();
      const reessayer = liste(page).getByRole("button", { name: "Réessayer" });
      await expect(reessayer).toBeVisible();

      mode = "normal";
      await reessayer.click();
      await expect(liste(page).getByRole("button", { name: /VTE-1/ })).toBeVisible();
    });
  });
});
