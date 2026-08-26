import type { PaginatedResponse } from "./pagination";

// Type du contrat réel GET /v1/mobile/depenses/mine côté elm-monolithe (voir
// docs/api-espace-client-contract.md §4, vérifié directement contre
// App\Http\Controllers\Api\Client\DepensesController et
// App\Http\Resources\Api\Client\DepenseResource le 26/08/2026). Version
// consolidée (tous véhicules accessibles) — accessible au proprietaire ET au
// livreur. Aucun filtre de statut/période par défaut côté backend
// (contrairement au dashboard) : une liste non filtrée renvoie TOUT.
export type ExpenseStatus = "brouillon" | "soumis" | "valide" | "rejete" | "annule";

export interface ExpenseVehicle {
  id: string;
  nom_vehicule: string;
  immatriculation: string;
}

export interface ClientExpense {
  id: string;
  date: string;
  montant: number;
  type_code: string;
  type_label: string;
  statut: ExpenseStatus;
  statut_label: string;
  commentaire: string | null;
  vehicule: ExpenseVehicle | null;
}

export interface ExpenseFilters {
  vehicule_id: string | null;
  depense_type_id: string | null;
  statut: ExpenseStatus | null;
  date_debut: string | null;
  date_fin: string | null;
}

export type ClientExpensesResponse = PaginatedResponse<ClientExpense, ExpenseFilters>;

/** Requête vers GET /api/client/expenses (BFF) — tous les filtres sont optionnels. */
export interface ExpensesQuery {
  vehicule_id?: string;
  depense_type_id?: string;
  statut?: ExpenseStatus;
  date_debut?: string;
  date_fin?: string;
  per_page?: number;
  page?: number;
}
