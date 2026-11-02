import { describe, expect, it } from "vitest";
import { dashboardExpensesTotal, type ClientDashboardResponse } from "./clientDashboard";

const dashboard = (depensesTotal: number | undefined, fraisDepenses: number) =>
  ({
    depenses_total: depensesTotal,
    summary: { frais_depenses_total: fraisDepenses },
  }) as ClientDashboardResponse;

describe("dashboardExpensesTotal", () => {
  it("utilise le total fourni par le backend, dépenses du livreur comprises", () => {
    expect(dashboardExpensesTotal(dashboard(25_000, 0))).toBe(25_000);
  });

  it("garde un total nul du backend sans revenir aux frais de véhicule", () => {
    expect(dashboardExpensesTotal(dashboard(0, 4_000))).toBe(0);
  });

  it("revient aux frais de véhicule si le backend ne fournit pas encore le total", () => {
    expect(dashboardExpensesTotal(dashboard(undefined, 4_000))).toBe(4_000);
  });
});
