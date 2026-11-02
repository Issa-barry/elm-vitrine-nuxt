import type { ApiVehiculeCommissionRow } from "~/types/api";

// Type du contrat réel GET /v1/mobile/vehicules/{vehiculeId}/commissions côté
// elm-monolithe, dérivé du contrat OpenAPI généré (chantier du 27/08/2026,
// voir types/api.ts — schema `VehiculeCommissionRow` propre, aucune
// imperfection constatée ici). Scopé à UN véhicule à la fois (404 si le
// véhicule n'existe pas ; liste vide s'il existe mais n'est pas accessible au
// compte connecté) — aucun endpoint consolidé "toutes commissions" n'existe
// côté backend (contrairement à /depenses/mine), voir useClientCommissions.ts
// pour la façon dont cette page les assemble.
export type CommissionStatus = "paye" | "partiel" | "en_attente";

export type VehicleCommission = ApiVehiculeCommissionRow;

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
