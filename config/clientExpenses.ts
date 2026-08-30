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
// au proprietaire ET au livreur. Aucun filtre de statut/période par défaut
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

export type ClientExpensesResponse = PaginatedResponse<ClientExpense, ExpenseFilters>;

/** Requête vers GET /api/client/expenses (BFF) — tous les filtres sont optionnels. */
export type ExpensesQuery = ApiDepensesQuery & { page?: number };
