import { describe, expect, it } from "vitest";
import { customPeriodError, expensePeriodBounds, groupExpensesByMonth, type ClientExpense, type ExpenseStatus } from "./clientExpenses";

const expense = (id: string, date: string, montant: number, statut: ExpenseStatus = "valide") =>
  ({ id, date, montant, statut }) as ClientExpense;

describe("groupExpensesByMonth", () => {
  it("réunit les dépenses d'un même mois et trie du plus récent au plus ancien", () => {
    const groups = groupExpensesByMonth([
      expense("a", "2026-09-06", 5_000),
      expense("b", "2026-11-02", 25_000),
      expense("c", "2026-11-20", 1_000),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Novembre 2026", "Septembre 2026"]);
    expect(groups[0].expenses.map((item) => item.id)).toEqual(["c", "b"]);
  });

  it("sépare un même mois sur deux années différentes", () => {
    const groups = groupExpensesByMonth([expense("a", "2025-10-15", 1), expense("b", "2026-10-15", 2)]);

    expect(groups.map((group) => group.label)).toEqual(["Octobre 2026", "Octobre 2025"]);
  });

  it("garde le mois d'une date en début ou fin de mois, quel que soit le fuseau", () => {
    const groups = groupExpensesByMonth([expense("a", "2026-11-01", 1), expense("b", "2026-10-31", 2)]);

    expect(groups.map((group) => group.key)).toEqual(["2026-11", "2026-10"]);
  });

  it("n'additionne que les dépenses validées, mais les compte toutes", () => {
    const [group] = groupExpensesByMonth([
      expense("a", "2026-10-01", 1_000),
      expense("b", "2026-10-02", 2_000),
      expense("c", "2026-10-03", 400, "rejete"),
      expense("d", "2026-10-04", 500, "soumis"),
      expense("e", "2026-10-05", 600, "annule"),
      expense("f", "2026-10-06", 700, "brouillon"),
    ]);

    expect(group.validatedTotal).toBe(3_000);
    expect(group.expenses).toHaveLength(6);
  });

  it("ne crée aucun groupe sans dépense", () => {
    expect(groupExpensesByMonth([])).toEqual([]);
  });
});

describe("expensePeriodBounds", () => {
  it("n'envoie aucune borne pour toutes les périodes", () => {
    expect(expensePeriodBounds("all", "2026-11-02")).toEqual({});
  });

  it("couvre le mois en cours entier, février bissextile compris", () => {
    expect(expensePeriodBounds("current_month", "2026-11-02")).toEqual({ date_debut: "2026-11-01", date_fin: "2026-11-30" });
    expect(expensePeriodBounds("current_month", "2028-02-10")).toEqual({ date_debut: "2028-02-01", date_fin: "2028-02-29" });
  });

  it("passe à l'année précédente pour le mois précédent de janvier", () => {
    expect(expensePeriodBounds("previous_month", "2026-11-30")).toEqual({ date_debut: "2026-10-01", date_fin: "2026-10-31" });
    expect(expensePeriodBounds("previous_month", "2026-01-15")).toEqual({ date_debut: "2025-12-01", date_fin: "2025-12-31" });
  });

  it("compte le mois en cours et les deux précédents dans les 3 derniers mois", () => {
    expect(expensePeriodBounds("last_3_months", "2026-11-02")).toEqual({ date_debut: "2026-09-01", date_fin: "2026-11-30" });
    expect(expensePeriodBounds("last_3_months", "2026-01-31")).toEqual({ date_debut: "2025-11-01", date_fin: "2026-01-31" });
  });

  it("couvre l'année en cours et l'année précédente", () => {
    expect(expensePeriodBounds("current_year", "2026-11-02")).toEqual({ date_debut: "2026-01-01", date_fin: "2026-12-31" });
    expect(expensePeriodBounds("previous_year", "2026-11-02")).toEqual({ date_debut: "2025-01-01", date_fin: "2025-12-31" });
  });

  it("reprend les dates de la période personnalisée", () => {
    expect(expensePeriodBounds("custom", "2026-11-02", { start: "2026-10-05", end: "2026-10-20" }))
      .toEqual({ date_debut: "2026-10-05", date_fin: "2026-10-20" });
  });
});

describe("customPeriodError", () => {
  it("exige les deux dates", () => {
    expect(customPeriodError("", "2026-10-20")).not.toBe("");
    expect(customPeriodError("2026-10-05", "")).not.toBe("");
  });

  it("refuse une fin antérieure au début", () => {
    expect(customPeriodError("2026-10-20", "2026-10-05")).toBe("La date de fin doit suivre la date de début.");
  });

  it("accepte une période valide, même sur un seul jour", () => {
    expect(customPeriodError("2026-10-05", "2026-10-20")).toBe("");
    expect(customPeriodError("2026-10-05", "2026-10-05")).toBe("");
  });
});
