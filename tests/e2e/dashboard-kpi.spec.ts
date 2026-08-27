import { test, expect } from "@playwright/test";
import { computeKpiTrend, formatKpiTrendPercent } from "../../utils/kpiTrend";
import { loginAsTestUser } from "./helpers";

// Couvre les 4 cartes KPI desktop/tablette paysage du dashboard
// (pages/espace-client/index.vue + components/client/dashboard/KpiCard.vue,
// markup repris de _template/apollo-vue-6.2.0/.../StatsEcommerceWidget.vue).
// Le dashboard mobile (.client-mobile-dashboard) n'est pas concerné par ces
// cartes et reste couvert par espace-client-navigation.spec.ts. Le calcul de
// variation lui-même (formule, arrondi, cas limites) est testé unitairement
// dans utils/kpiTrend.test.ts ; ici on vérifie juste que la page affiche bien
// le résultat de ce calcul contre de VRAIES données GET /v1/mobile/dashboard
// (mock-backend.mjs), période courante vs "mois_passe", pas un chiffre
// inventé côté Nuxt.
//
// Les montants attendus sont calculés ici avec le même formatter (fr-FR)
// que l'app plutôt que codés en dur avec un espace normal : Intl.NumberFormat
// utilise une espace fine insécable (U+202F) comme séparateur de milliers,
// pas une espace classique.
const formatGnf = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;

// Reflet exact de DASHBOARD_PAR_VEHICULE_BY_PERIOD dans tests/e2e/mock-backend.mjs
// (period=ce_mois, la période par défaut demandée par la page). Valeurs
// volontairement toutes distinctes entre elles (voir le commentaire du mock)
// pour ne jamais produire deux éléments identiques dans
// .client-desktop-dashboard (violation du mode strict de Playwright).
const generated = 4_240_000; // total_earned : 2 760 000 + 1 480 000
const paid = 2_750_000; // total_paid : 1 790 000 + 960 000
const totalExpenses = 615_000; // frais_depenses_total : 410 000 + 205 000
const remaining = 1_490_000; // balance : 970 000 + 520 000
const operationsCount = 6; // operations_count : 3 + 3

// Reflet exact de la période "mois_passe" du même mock — sert de
// comparaison RÉELLE (2e appel GET .../dashboard?period=mois_passe, voir
// pages/espace-client/index.vue) pour les 4 variations affichées.
const previousGenerated = 3_740_000;
const previousExpenses = 573_000;
const previousRemaining = 1_310_000;
const previousOperationsCount = 4;

const generatedTrend = formatKpiTrendPercent(computeKpiTrend(generated, previousGenerated)!.percent);
const expensesTrend = formatKpiTrendPercent(computeKpiTrend(totalExpenses, previousExpenses, true)!.percent);
const operationsTrend = formatKpiTrendPercent(computeKpiTrend(operationsCount, previousOperationsCount)!.percent);
const remainingTrend = formatKpiTrendPercent(computeKpiTrend(remaining, previousRemaining)!.percent);

test.describe("Dashboard — cartes KPI (tablette paysage / desktop)", () => {
  test("affiche les 4 cartes avec les bons libellés et montants", async ({ page }) => {
    await loginAsTestUser(page);

    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("Commission générée")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(generated))).toBeVisible();
    await expect(kpiRow.getByText("Dépenses", { exact: true })).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(totalExpenses))).toBeVisible();
    // "Opérations" (operations_count réel) — remplace l'ancienne carte "Net à
    // payer", qui n'avait aucun équivalent dans GET /v1/mobile/dashboard
    // (voir commentaire "Carte n°3" dans pages/espace-client/index.vue).
    await expect(kpiRow.getByText("Opérations")).toBeVisible();
    await expect(kpiRow.getByText(String(operationsCount), { exact: true })).toBeVisible();
    await expect(kpiRow.getByText("Reste à payer")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(remaining))).toBeVisible();
  });

  test("la carte \"Reste à payer\" affiche le sous-titre Déjà payé", async ({ page }) => {
    await loginAsTestUser(page);
    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("Déjà payé")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(paid))).toBeVisible();
  });

  test("affiche des variations réellement calculées, pas de pourcentage inventé", async ({ page }) => {
    await loginAsTestUser(page);
    const kpiRow = page.locator(".client-desktop-dashboard");

    await expect(kpiRow.getByText(generatedTrend, { exact: true })).toBeVisible();
    await expect(kpiRow.getByText(expensesTrend, { exact: true })).toBeVisible();
    await expect(kpiRow.getByText(operationsTrend, { exact: true })).toBeVisible();
    await expect(kpiRow.getByText(remainingTrend, { exact: true })).toBeVisible();

    // Jamais de pourcentage cassé.
    await expect(kpiRow.getByText("NaN%")).toHaveCount(0);
    await expect(kpiRow.getByText("Infinity%")).toHaveCount(0);
    await expect(kpiRow.getByText(/^[+-]?0%$/)).toHaveCount(0); // les 4 KPI actuels varient tous, aucun ne doit tomber à "0%"/"+0%"/"-0%"

    // Plus de mini line chart (retiré à la demande du 26/08) : aucun <svg> dans la grille KPI.
    await expect(kpiRow.locator("svg")).toHaveCount(0);
  });

  test("Dépenses : une hausse de dépenses ne s'affiche pas en vert (tone inversé)", async ({ page }) => {
    await loginAsTestUser(page);
    const expensesTrendValue = computeKpiTrend(totalExpenses, previousExpenses, true)!;
    // Garde-fou : si ce mock venait à changer et que Dépenses baissait, ce
    // test perdrait son sens (voir utils/kpiTrend.test.ts pour le cas inverse).
    expect(expensesTrendValue.percent).toBeGreaterThan(0);
    expect(expensesTrendValue.tone).toBe("negative");

    const expensesCard = page.locator(".client-desktop-dashboard")
      .getByText("Dépenses", { exact: true })
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");
    // La classe de couleur (text-red-500) est sur le conteneur du badge, pas
    // sur le <span> du texte lui-même (voir KpiCard.vue).
    const trendBadge = expensesCard.getByText(expensesTrend, { exact: true }).locator("xpath=parent::div");
    await expect(trendBadge).toHaveClass(/text-red-500/);
  });

  test("un véhicule de \"Solde par véhicule\" mène à ses commissions filtrées, pas à sa fiche véhicule", async ({ page }) => {
    await loginAsTestUser(page);
    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("ABARRY", { exact: true })).toBeVisible({ timeout: 10_000 });

    await kpiRow.getByText("ABARRY", { exact: true }).click();
    await expect(page).toHaveURL(/\/espace-client\/commissions\?vehicule_id=veh-1$/);

    // Arrive déjà filtré sur ce véhicule (voir pages/espace-client/commissions.vue
    // ?vehicule_id=...) : seules les commissions d'ABARRY (veh-1) apparaissent.
    const desktop = page.locator(".client-desktop-expenses");
    await expect(desktop.getByText("CMD-2847")).toBeVisible({ timeout: 10_000 });
    await expect(desktop.getByText("CMD-2820")).toBeVisible();
    await expect(desktop.getByText("CMD-2839")).toHaveCount(0);
  });
});

test.describe("Dashboard — responsive des cartes KPI", () => {
  test("mobile (390x844) : garde le dashboard mobile actuel, pas les cartes Apollo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await expect(page.locator(".client-mobile-dashboard")).toBeVisible();
    await expect(page.locator(".client-desktop-dashboard")).toBeHidden();
  });

  test("tablette portrait (834x1210) : garde le dashboard mobile enrichi, pas les cartes Apollo", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1210 });
    await loginAsTestUser(page);
    await expect(page.locator(".client-mobile-dashboard")).toBeVisible();
    await expect(page.locator(".client-desktop-dashboard")).toBeHidden();
  });

  test("tablette paysage étroite (1024x768) : cartes Apollo en 2 colonnes", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsTestUser(page);
    await expect(page.locator(".client-desktop-dashboard")).toBeVisible();

    const firstCard = page.locator(".client-desktop-dashboard")
      .getByText("Commission générée")
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");
    const thirdCard = page.locator(".client-desktop-dashboard")
      .getByText("Opérations")
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");

    const firstBox = await firstCard.boundingBox();
    const thirdBox = await thirdCard.boundingBox();
    expect(firstBox).not.toBeNull();
    expect(thirdBox).not.toBeNull();
    // 2 colonnes -> la 3e carte (Opérations) commence une nouvelle ligne, donc nettement plus bas que la 1re.
    expect(thirdBox!.y).toBeGreaterThan(firstBox!.y + 10);
  });

  test("desktop large (1440x900) : les 4 cartes KPI tiennent sur une seule ligne", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsTestUser(page);
    await expect(page.locator(".client-desktop-dashboard")).toBeVisible();

    const firstCard = page.locator(".client-desktop-dashboard")
      .getByText("Commission générée")
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");
    const lastCard = page.locator(".client-desktop-dashboard")
      .getByText("Reste à payer")
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");

    const firstBox = await firstCard.boundingBox();
    const lastBox = await lastCard.boundingBox();
    expect(firstBox).not.toBeNull();
    expect(lastBox).not.toBeNull();
    // 4 colonnes -> même ligne (écart vertical négligeable) et la 4e carte est à droite de la 1re.
    expect(Math.abs(lastBox!.y - firstBox!.y)).toBeLessThan(10);
    expect(lastBox!.x).toBeGreaterThan(firstBox!.x);
  });
});
