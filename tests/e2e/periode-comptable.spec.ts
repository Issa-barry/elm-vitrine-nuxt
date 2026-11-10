import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers";

// Filtre période comptable commun aux écrans Commissions, Commandes et
// Dépenses. Réponses interceptées : ces tests vérifient l'interface et les
// paramètres envoyés, le filtrage réel est couvert par
// tests/Feature/Api/Client/PeriodeComptableFiltreTest.php côté elm-monolithe.
test.use({ serviceWorkers: "block" });

const maintenant = new Date();
const anneeCourante = String(maintenant.getUTCFullYear());
const moisCourant = String(maintenant.getUTCMonth() + 1);
const anneePrecedente = String(maintenant.getUTCFullYear() - 1);

const bornes = (query: URLSearchParams) => {
  if (query.get("quinzaine") === "P1") return { date_debut: "2024-02-01", date_fin: "2024-02-15" };
  if (query.get("quinzaine") === "P2") return { date_debut: "2024-02-16", date_fin: "2024-02-29" };
  return { date_debut: "2024-02-01", date_fin: "2024-02-29" };
};

const paginer = (query: URLSearchParams, data: unknown[]) => ({
  data,
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, last_page: 1, per_page: 50, total: data.length },
  filters: bornes(query),
});

const dashboard = (query: URLSearchParams) => {
  const gains = query.get("quinzaine") === "P1" ? 1_000 : query.get("quinzaine") === "P2" ? 2_000 : 3_000;
  return {
    filters: { period: "custom", vehicule_id: null, statut: null, ...bornes(query) },
    summary: { total_earned: gains, total_paid: 0, frais_depenses_total: 0, balance: gains, operations_count: 1 },
    depenses_total: 0,
    summary_evolution: null,
    comparison_period: null,
    par_vehicule: [],
    vehicules: [],
  };
};

type Requetes = Record<"dashboard" | "activity" | "expenses", URLSearchParams[]>;

async function intercepter(page: Page, reponseDepenses: (query: URLSearchParams) => unknown[] = () => []): Promise<Requetes> {
  const requetes: Requetes = { dashboard: [], activity: [], expenses: [] };

  await page.route("**/api/client/dashboard*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    requetes.dashboard.push(query);
    await route.fulfill({ json: dashboard(query) });
  });
  await page.route("**/api/client/activity*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    requetes.activity.push(query);
    await route.fulfill({ json: paginer(query, []) });
  });
  await page.route("**/api/client/expenses*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    requetes.expenses.push(query);
    await route.fulfill({ json: paginer(query, reponseDepenses(query)) });
  });

  return requetes;
}

const filtre = (conteneur: Locator) => conteneur.getByRole("region", { name: "Période comptable" });
const quinzaine = (conteneur: Locator, nom: string) => filtre(conteneur).getByRole("button", { name: nom });

async function choisir(page: Page, conteneur: Locator, champ: string, option: string) {
  await filtre(conteneur).getByRole("combobox", { name: champ }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

const ECRANS = [
  { nom: "Commissions", url: "/espace-client/commissions", conteneur: ".client-mobile-expenses", cle: "dashboard" },
  { nom: "Commandes", url: "/espace-client/commandes", conteneur: ".client-mobile-deliveries", cle: "activity" },
  { nom: "Dépenses", url: "/espace-client/depenses", conteneur: ".client-mobile-expenses", cle: "expenses" },
] as const;

test.describe("Espace client — filtre période comptable", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const ecran of ECRANS) {
    test(`${ecran.nom} : mois courant par défaut, puis P1, P2 et changement d'année`, async ({ page }) => {
      const requetes = await intercepter(page);
      await page.setViewportSize({ width: 440, height: 956 });
      await loginAsTestUser(page);
      await page.goto(ecran.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("load");

      const conteneur = page.locator(ecran.conteneur);
      await expect(filtre(conteneur).getByRole("status")).toHaveText("Du 01/02/2024 au 29/02/2024", { timeout: 30_000 });
      await expect(quinzaine(conteneur, "Tout le mois")).toHaveAttribute("aria-pressed", "true");

      // La première : sur Commissions, un mois entier est suivi de la requête du mois précédent (tendance).
      const premiere = requetes[ecran.cle][0]!;
      expect(premiere.get("annee")).toBe(anneeCourante);
      expect(premiere.get("mois")).toBe(moisCourant);
      expect(premiere.get("quinzaine")).toBe("TOUT");
      expect(premiere.get("date_debut")).toBeNull();

      const derniere = () => requetes[ecran.cle].at(-1)!;

      await quinzaine(conteneur, "P1 : 01–15").click();
      await expect(quinzaine(conteneur, "P1 : 01–15")).toHaveAttribute("aria-pressed", "true");
      await expect(filtre(conteneur).getByRole("status")).toHaveText("Du 01/02/2024 au 15/02/2024");
      expect(derniere().get("quinzaine")).toBe("P1");
      expect(derniere().get("mois")).toBe(moisCourant);

      await quinzaine(conteneur, "P2 : 16–Fin").click();
      await expect(filtre(conteneur).getByRole("status")).toHaveText("Du 16/02/2024 au 29/02/2024");
      expect(derniere().get("quinzaine")).toBe("P2");

      await choisir(page, conteneur, "Année", anneePrecedente);
      await choisir(page, conteneur, "Mois", "Février");
      await expect.poll(() => derniere().get("mois")).toBe("2");
      expect(derniere().get("annee")).toBe(anneePrecedente);
      expect(derniere().get("quinzaine")).toBe("P2");
    });
  }

  test("la sélection est conservée en passant d'un écran à l'autre", async ({ page }) => {
    const requetes = await intercepter(page);
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);

    const navigation = page.locator(".client-mobile-bottom-nav");
    await navigation.getByRole("link", { name: "Commissions" }).click();
    await expect(page).toHaveURL(/\/espace-client\/commissions$/);

    const commissions = page.locator(".client-mobile-expenses");
    await expect(filtre(commissions).getByRole("status")).toHaveText(/^Du /, { timeout: 30_000 });
    await quinzaine(commissions, "P1 : 01–15").click();
    await expect.poll(() => requetes.dashboard.at(-1)?.get("quinzaine")).toBe("P1");

    await navigation.getByRole("link", { name: "Dépenses" }).click();
    await expect(page).toHaveURL(/\/espace-client\/depenses$/);
    const depenses = page.locator(".client-mobile-expenses");
    await expect(quinzaine(depenses, "P1 : 01–15")).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    await expect.poll(() => requetes.expenses.at(-1)?.get("quinzaine")).toBe("P1");

    await navigation.getByRole("link", { name: "Commandes" }).click();
    await expect(page).toHaveURL(/\/espace-client\/commandes$/);
    const ventes = page.locator(".client-mobile-deliveries");
    await expect(quinzaine(ventes, "P1 : 01–15")).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    await expect.poll(() => requetes.activity.at(-1)?.get("quinzaine")).toBe("P1");
  });

  test("les indicateurs des commissions suivent la période et les autres filtres restent actifs", async ({ page }) => {
    const requetes = await intercepter(page);
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    const conteneur = page.locator(".client-mobile-expenses");
    const montant = (gnf: number) => conteneur.getByText(`${new Intl.NumberFormat("fr-FR").format(gnf)} GNF`).first();
    await expect(montant(3_000)).toBeVisible({ timeout: 30_000 });

    await quinzaine(conteneur, "P1 : 01–15").click();
    await expect(montant(1_000)).toBeVisible();

    // Un autre filtre de période prend la main ; toucher au filtre comptable le réactive.
    await conteneur.locator(".client-commissions-filters").getByRole("combobox").first().click();
    await page.getByRole("option", { name: "7 derniers jours" }).click();
    await expect.poll(() => requetes.dashboard.at(-1)?.get("period")).toBe("7j");
    expect(requetes.dashboard.at(-1)?.get("annee")).toBeNull();
    await expect(quinzaine(conteneur, "P1 : 01–15")).toHaveAttribute("aria-pressed", "false");

    await quinzaine(conteneur, "P1 : 01–15").click();
    await expect.poll(() => requetes.dashboard.at(-1)?.get("quinzaine")).toBe("P1");
    expect(requetes.dashboard.at(-1)?.get("period")).toBeNull();
    await expect(quinzaine(conteneur, "P1 : 01–15")).toHaveAttribute("aria-pressed", "true");
  });

  test("dépenses : une période vide le dit, et propose de voir toutes les périodes", async ({ page }) => {
    const depense = {
      id: "dep-septembre",
      date: "2026-09-06",
      montant: 2_000,
      type_code: "avance_salaire",
      type_label: "Avance sur salaire",
      statut: "valide",
      statut_label: "Validé",
      commentaire: null,
      vehicule: null,
    };
    const requetes = await intercepter(page, (query) => (query.get("annee") ? [] : [depense]));
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    const conteneur = page.locator(".client-mobile-expenses");
    await expect(conteneur.getByText("Aucune dépense sur cette période")).toBeVisible({ timeout: 30_000 });

    await conteneur.getByRole("button", { name: "Voir toutes les périodes" }).click();
    await expect(conteneur.getByText("2 000 GNF".replace(" ", " ")).first()).toBeVisible();
    expect(requetes.expenses.at(-1)?.get("annee")).toBeNull();
    await expect(conteneur.getByRole("button", { name: /Retirer le filtre Période/ })).toBeVisible();
  });

  test("dépenses : le lien ?periode=toutes ouvre toutes les périodes", async ({ page }) => {
    const requetes = await intercepter(page);
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses?periode=toutes", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    await expect.poll(() => requetes.expenses.length, { timeout: 30_000 }).toBeGreaterThan(0);
    expect(requetes.expenses.at(-1)?.get("annee")).toBeNull();
  });

  test("commandes : un lien vers une opération charge toutes les périodes", async ({ page }) => {
    const requetes = await intercepter(page);
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/commandes?commande=act-1", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    await expect.poll(() => requetes.activity.length, { timeout: 30_000 }).toBeGreaterThan(0);
    expect(requetes.activity.at(-1)?.get("annee")).toBeNull();
  });

  test("une réponse lente d'une ancienne période n'écrase pas la période courante", async ({ page }) => {
    await intercepter(page);
    await page.route("**/api/client/expenses*", async (route) => {
      const query = new URL(route.request().url()).searchParams;
      if (query.get("quinzaine") === "P1") await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.fulfill({ json: paginer(query, []) });
    });
    await page.setViewportSize({ width: 440, height: 956 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/depenses", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    const conteneur = page.locator(".client-mobile-expenses");
    await expect(filtre(conteneur).getByRole("status")).toHaveText(/^Du /, { timeout: 30_000 });

    await quinzaine(conteneur, "P1 : 01–15").click();
    await quinzaine(conteneur, "P2 : 16–Fin").click();
    await expect(filtre(conteneur).getByRole("status")).toHaveText("Du 16/02/2024 au 29/02/2024");
    await page.waitForTimeout(2_000);
    await expect(filtre(conteneur).getByRole("status")).toHaveText("Du 16/02/2024 au 29/02/2024");
  });

  test("tient sans débordement sur un écran de 320 px, en bureau sur une seule zone", async ({ page }) => {
    await intercepter(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await loginAsTestUser(page);
    await page.goto("/espace-client/commissions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load");

    const conteneur = page.locator(".client-mobile-expenses");
    await expect(filtre(conteneur).getByRole("status")).toHaveText(/^Du /, { timeout: 30_000 });
    const largeurs = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(largeurs.page).toBeLessThanOrEqual(largeurs.ecran);
    for (const nom of ["Tout le mois", "P1 : 01–15", "P2 : 16–Fin"]) {
      const bouton = quinzaine(conteneur, nom);
      const debordement = await bouton.evaluate((element) => element.scrollWidth > element.clientWidth);
      expect(debordement, nom).toBe(false);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator(".client-desktop-expenses").getByRole("region", { name: "Période comptable" })).toBeVisible();
  });
});
