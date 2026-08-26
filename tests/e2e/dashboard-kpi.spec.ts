import { test, expect } from "@playwright/test";

// Couvre les 4 cartes KPI desktop/tablette paysage du dashboard
// (pages/espace-client/index.vue + components/client/dashboard/KpiCard.vue,
// markup repris de _template/apollo-vue-6.2.0/.../StatsEcommerceWidget.vue).
// Le dashboard mobile (.client-mobile-dashboard) n'est pas concerné par ces
// cartes et reste couvert par espace-client-navigation.spec.ts.
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

test.describe("Dashboard — cartes KPI (tablette paysage / desktop)", () => {
  test("affiche les 4 cartes avec les bons libellés et montants", async ({ page }) => {
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });

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
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("Déjà payé")).toBeVisible();
    await expect(kpiRow.getByText(formatGnf(paid))).toBeVisible();
  });

  test("affiche un état neutre pour la variation (pas d'historique de période disponible)", async ({ page }) => {
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
    // Les 4 cartes sont dans le même état tant qu'aucune donnée de période
    // précédente n'existe dans le dashboard : "—" plutôt qu'un pourcentage
    // inventé (aucun +X%/-X% ne doit apparaître dans la grille KPI).
    const kpiRow = page.locator(".client-desktop-dashboard");
    await expect(kpiRow.getByText("—")).toHaveCount(4);
    await expect(kpiRow.locator(".pi-arrow-up, .pi-arrow-down")).toHaveCount(0);
  });
});

test.describe("Dashboard — responsive des cartes KPI", () => {
  test("mobile (390x844) : garde le dashboard mobile actuel, pas les cartes Apollo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".client-mobile-dashboard")).toBeVisible();
    await expect(page.locator(".client-desktop-dashboard")).toBeHidden();
  });

  test("tablette portrait (834x1210) : garde le dashboard mobile enrichi, pas les cartes Apollo", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1210 });
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".client-mobile-dashboard")).toBeVisible();
    await expect(page.locator(".client-desktop-dashboard")).toBeHidden();
  });

  test("tablette paysage étroite (1024x768) : cartes Apollo en 2 colonnes", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
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
    await page.goto("/espace-client", { waitUntil: "domcontentloaded" });
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
