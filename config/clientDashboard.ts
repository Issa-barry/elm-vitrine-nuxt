// Type du contrat réel GET /v1/mobile/dashboard côté elm-monolithe (voir
// docs/api-espace-client-contract.md §5, vérifié directement contre
// App\Http\Controllers\Api\Client\DashboardController et
// App\Services\Client\ClientEarningsService le 26/08/2026). Même moteur que
// le dashboard Inertia — les montants renvoyés ici sont LA source de vérité,
// jamais recalculés côté Nuxt (voir demande du 26/08/2026, section 30).
export type DashboardPeriod = "7j" | "30j" | "ce_mois" | "mois_passe" | "custom";

export interface DashboardFilters {
  period: DashboardPeriod;
  date_debut: string | null;
  date_fin: string | null;
  vehicule_id: string | null;
  statut: string | null;
}

export interface DashboardSummary {
  total_earned: number;
  total_paid: number;
  frais_depenses_total: number;
  balance: number;
  operations_count: number;
}

export interface DashboardVehiculeBalance {
  vehicule_id: string;
  nom_vehicule: string;
  immatriculation: string;
  frais_depenses: number;
  total_earned: number;
  total_paid: number;
  balance: number;
}

export interface DashboardVehiculeIdentity {
  id: string;
  nom_vehicule: string;
  immatriculation: string;
}

export interface ClientDashboardResponse {
  filters: DashboardFilters;
  summary: DashboardSummary;
  // Liste toujours l'intégralité du parc accessible, même filtré par
  // vehicule_id (seuls les montants sont restreints) — ne pas interpréter
  // comme un bug frontend, voir docs/api-espace-client-contract.md §5.
  par_vehicule: DashboardVehiculeBalance[];
  vehicules: DashboardVehiculeIdentity[];
}

/** Requête vers GET /api/client/dashboard (BFF) — tous les filtres sont optionnels. */
export interface DashboardQuery {
  period?: DashboardPeriod;
  date_debut?: string;
  date_fin?: string;
  vehicule_id?: string;
  statut?: string;
}
