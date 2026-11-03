import type { ApiDepensesMineResponse, ApiDepensesQuery } from "~/types/api";
import type { PaginatedResponse } from "./pagination";

// Formes HTTP dérivées du contrat OpenAPI généré (chantier du 27/08/2026,
// voir types/api.ts) — sauf `statut`/`filters`, volontairement conservés à
// la main : le schema généré `DepenseResource.statut` est un `string` non
// fermé (Scramble ne reconnaît pas `$this->statut?->value`, un enum PHP
// converti en chaîne, comme la même énumération que le paramètre de requête
// `statut`, lui bien typé en union fermée) et `filters` échoué en `unknown`
// (aucun type inférable pour un tableau associatif brut côté contrôleur) —
// voir le rapport de ce chantier pour le détail des imperfections
// constatées. Version consolidée (tous véhicules accessibles) — accessible
// au proprietaire ET au livreur, qui voit aussi ses dépenses personnelles
// (`vehicule: null`, ex. avance sur salaire). Aucun filtre de statut/période par défaut
// côté backend (contrairement au dashboard) : une liste non filtrée renvoie
// TOUT.
export type ExpenseStatus = "brouillon" | "soumis" | "valide" | "rejete" | "annule";

export type ExpenseVehicle = NonNullable<ApiDepensesMineResponse["data"][number]["vehicule"]>;

export type ClientExpense = Omit<ApiDepensesMineResponse["data"][number], "statut"> & { statut: ExpenseStatus };

export interface ExpenseFilters {
  vehicule_id: string | null;
  depense_type_id: string | null;
  statut: ExpenseStatus | null;
  date_debut: string | null;
  date_fin: string | null;
}

// `total_valide` (carte "Dépenses" de l'accueil mobile) : optionnel tant que la
// vitrine peut être déployée avant le backend.
export type ClientExpensesResponse = PaginatedResponse<ClientExpense, ExpenseFilters> & { total_valide?: number };

/** Requête vers GET /api/client/expenses (BFF) — tous les filtres sont optionnels. */
export type ExpensesQuery = ApiDepensesQuery & { page?: number };

export type ExpensePeriod =
  | "all"
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "current_year"
  | "previous_year"
  | "custom";

export const EXPENSE_PERIOD_OPTIONS: Array<{ label: string; value: ExpensePeriod }> = [
  { label: "Toutes les périodes", value: "all" },
  { label: "Mois en cours", value: "current_month" },
  { label: "Mois précédent", value: "previous_month" },
  { label: "3 derniers mois", value: "last_3_months" },
  { label: "Cette année", value: "current_year" },
  { label: "Année précédente", value: "previous_year" },
  { label: "Période personnalisée", value: "custom" },
];

const isoDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

// Bornes envoyées au backend (date_debut/date_fin), `today` au format
// YYYY-MM-DD. Chaque période va jusqu'à la fin de son mois ou de son année pour
// ne pas masquer une dépense datée plus tard dans la période. "3 derniers mois"
// compte le mois en cours et les deux précédents.
export function expensePeriodBounds(
  period: ExpensePeriod,
  today: string,
  custom: { start: string; end: string } = { start: "", end: "" },
): { date_debut?: string; date_fin?: string } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;

  switch (period) {
    case "current_month":
      return { date_debut: isoDate(year, month, 1), date_fin: isoDate(year, month + 1, 0) };
    case "previous_month":
      return { date_debut: isoDate(year, month - 1, 1), date_fin: isoDate(year, month, 0) };
    case "last_3_months":
      return { date_debut: isoDate(year, month - 2, 1), date_fin: isoDate(year, month + 1, 0) };
    case "current_year":
      return { date_debut: isoDate(year, 0, 1), date_fin: isoDate(year, 11, 31) };
    case "previous_year":
      return { date_debut: isoDate(year - 1, 0, 1), date_fin: isoDate(year - 1, 11, 31) };
    case "custom":
      return { date_debut: custom.start || undefined, date_fin: custom.end || undefined };
    default:
      return {};
  }
}

// Message d'erreur de la période personnalisée, "" si elle est valide.
export function customPeriodError(start: string, end: string): string {
  if (!start || !end) return "Renseignez la date de début et la date de fin.";
  if (end < start) return "La date de fin doit suivre la date de début.";
  return "";
}

export interface ExpenseMonthGroup {
  key: string;
  label: string;
  expenses: ClientExpense[];
  // Validées seulement, comme "Total validé" : une dépense rejetée, annulée ou
  // encore en attente ne s'additionne jamais aux autres.
  validatedTotal: number;
}

const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

// Groupes calculés depuis les dates réelles, du mois le plus récent au plus
// ancien. Lu en UTC : une date YYYY-MM-DD sans heure ne change jamais de mois
// selon le fuseau de l'appareil.
export function groupExpensesByMonth(expenses: ClientExpense[]): ExpenseMonthGroup[] {
  const groups = new Map<string, ExpenseMonthGroup>();
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  for (const expense of sorted) {
    const key = expense.date.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      const label = monthYearFormatter.format(new Date(`${key}-01T00:00:00Z`));
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), expenses: [], validatedTotal: 0 };
      groups.set(key, group);
    }
    group.expenses.push(expense);
    if (expense.statut === "valide") group.validatedTotal += expense.montant;
  }

  return [...groups.values()];
}
