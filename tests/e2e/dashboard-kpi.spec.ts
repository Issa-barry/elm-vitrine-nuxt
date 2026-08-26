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
// le résultat de ce calcul, pas un chiffre différent.
//
// Les montants attendus sont calculés ici avec le même formatter (fr-FR)
// que l'app plutôt que codés en dur avec un espace normal : Intl.NumberFormat
// utilise une espace fine insécable (U+202F) comme séparateur de milliers,
// pas une espace classique.
const formatGnf = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;

const vehicles = [
  { commission: 2_380_000, paid: 1_800_000 },
  { commission: 1_950_000, paid: 1_450_000 },
  { commission: 1_420_000, paid: 850_000 },
];
const generated = vehicles.reduce((sum, v) => sum + v.commission, 0);
const paid = vehicles.reduce((sum, v) => sum + v.paid, 0);
const remaining = generated - paid;
const totalExpenses = 614_200;
const netToPay = generated - totalExpenses;

// Même instantané "période précédente" que pages/espace-client/index.vue.
const previousVehicles = [
  { commission: 2_150_000, paid: 1_600_000 },
  { commission: 1_780_000, paid: 1_300_000 },
  { commission: 1_190_000, paid: 700_000 },
];
const previousExpenses = 590_000;
const previousGenerated = previousVehicles.reduce((sum, v) => sum + v.commission, 0);
const previousRemaining = previousVehicles.reduce((sum, v) => sum + v.commission - v.paid, 0);
const previousNetToPay = previousGenerated - previousExpenses;

const generatedTrend = formatKpiTrendPercent(computeKpiTrend(generated, previousGenerated)!.percent);
const expensesTrend = formatKpiTrendPercent(computeKpiTrend(totalExpenses, previousExpenses, true)!.percent);
const netTrend = formatKpiTrendPercent(computeKpiTrend(netToPay, previousNetToPay)!.percent);
const remainingTrend = formatKpiTrendPercent(computeKpiTrend(remaining, previousRemaining)!.percent);

test.describe("Dashboard — cartes KPI (tablette paysage / desktop)", () => {
  test("affiche les 4 cartes avec les bons libellés et montants", async ({ page }) => {
    await loginAsTestUser(page);

    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("Commission générée")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(generated))).toBeVisible();
    await expect(kpiRow.getByText("Dépenses", { exact: true })).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(totalExpenses))).toBeVisible();
    await expect(kpiRow.getByText("Net à payer")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(netToPay))).toBeVisible();
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
    await expect(kpiRow.getByText(netTrend, { exact: true })).toBeVisible();
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
      .getByText("Net à payer")
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");

    const firstBox = await firstCard.boundingBox();
    const thirdBox = await thirdCard.boundingBox();
    expect(firstBox).not.toBeNull();
    expect(thirdBox).not.toBeNull();
    // 2 colonnes -> la 3e carte (Net à payer) commence une nouvelle ligne, donc nettement plus bas que la 1re.
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
