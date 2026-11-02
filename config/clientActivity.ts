import type { ApiActiviteQuery } from "~/types/api";
import type { PaginatedResponse } from "./pagination";

// Type du contrat réel GET /v1/mobile/activite côté elm-monolithe (voir
// docs/api-espace-client-contract.md §5, vérifié directement contre
// App\Http\Controllers\Api\Client\ActiviteController le 26/08/2026).
// Historique complet (tous statuts) mêlant deux modèles à vocabulaire de
// statut distinct — jamais de correspondance inventée entre les deux (voir
// activityTypeLabel ci-dessous, qui ne fait que traduire `type`, jamais
// `statut`, dont le libellé vient déjà du backend via `statut_label`).
//
// IMPERFECTION OpenAPI CONSTATÉE (chantier "types OpenAPI" du 27/08/2026,
// voir types/generated/elm-api.ts) : `data` est généré en `string[]` pour
// cet endpoint précis — ActiviteController fusionne deux modèles
// (CommandeVente, TransfertLogistique) en tableaux PHP associatifs bruts
// (jamais une Resource/DTO typée, contrairement à `par_vehicule` ->
// `VehiculeEarningsRow`), Scramble ne peut donc rien inférer de fiable pour
// la forme des items. `filters` échoue de la même façon en `unknown` (tous
// les endpoints paginés de ce contrat, même cause). ClientActivityItem/
// ActivityVehicle/ActivityFilters restent donc écrits à la main ; seuls les
// PARAMÈTRES DE REQUÊTE (type/vehicule_id/dates/per_page), eux correctement
// typés côté OpenAPI, viennent du contrat généré.
export type ActivityType = "vente" | "logistique";

export interface ActivityVehicle {
  id: string;
  nom_vehicule: string;
  immatriculation: string;
}

export interface ClientActivityItem {
  id: string;
  type: ActivityType;
  reference: string;
  statut: string;
  statut_label: string;
  site_source: string;
  site_destination: string;
  vehicule: ActivityVehicle | null;
  date: string;
  nb_packs: number;
}

export interface ActivityFilters {
  type: ActivityType | null;
  statut: string | null;
  vehicule_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
}

export type ClientActivityResponse = PaginatedResponse<ClientActivityItem, ActivityFilters>;

/**
 * Requête vers GET /api/client/activity (BFF) — dérivée des paramètres de
 * requête OpenAPI (ApiActiviteQuery, correctement typés) + `page`, absent du
 * contrat documenté mais accepté nativement par le paginateur Laravel.
 * `statut` volontairement omis de ce type malgré sa présence dans le contrat
 * OpenAPI : le backend l'exige accompagné de `type` (422 sinon, deux
 * vocabulaires de statut différents selon le type) — la page
 * /espace-client/activite n'expose pour l'instant qu'un filtre par
 * `type`/`vehicule_id`/période, pas par statut (qui demanderait une liste
 * d'options dépendante du type sélectionné, hors périmètre de cette passe,
 * voir demande du 26/08/2026, section 38 : pas de refonte complète de l'UI).
 */
export type ActivityQuery = Omit<ApiActiviteQuery, "statut"> & { page?: number };

/** Libellé du type, pour un badge — ne reformule jamais `statut_label` (déjà fourni par le backend). */
export function activityTypeLabel(type: ActivityType): string {
  return type === "vente" ? "Vente" : "Logistique";
}
