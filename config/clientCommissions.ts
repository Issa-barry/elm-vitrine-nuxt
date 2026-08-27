// Type du contrat réel GET /v1/mobile/vehicules/{vehiculeId}/commissions côté
// elm-monolithe (voir docs/api-espace-client-contract.md §4, vérifié
// directement contre App\Http\Controllers\Api\Client\VehiculeCommissionsController
// le 27/08/2026). Scopé à UN véhicule à la fois (404 si le véhicule
// n'existe pas ; liste vide s'il existe mais n'est pas accessible au compte
// connecté) — aucun endpoint consolidé "toutes commissions" n'existe côté
// backend (contrairement à /depenses/mine), voir useClientCommissions.ts pour
// la façon dont cette page les assemble.
export type CommissionStatus = "paye" | "partiel" | "en_attente";

export interface VehicleCommission {
  id: string;
  reference: string;
  // ISO 8601, ou null si aucune date de perception n'a pu être déterminée
  // côté backend (voir `?->toISOString()` dans le contrôleur réel).
  date: string | null;
  montant_net: number;
  montant_a_payer: number;
  montant_verse: number;
  montant_restant: number;
  statut: CommissionStatus;
  mois: string;
}

// Extension purement frontend : le champ `vehicule` n'existe PAS dans la
// réponse réelle (déjà scopée par l'URL) — ajouté ici uniquement pour
// afficher la provenance une fois plusieurs véhicules assemblés sur une même
// page (voir composables/useClientCommissions.ts).
export interface VehicleCommissionWithVehicle extends VehicleCommission {
  vehicule: { id: string; nom: string; immatriculation: string };
}

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  paye: "Payé",
  partiel: "Partiel",
  en_attente: "En attente",
};
