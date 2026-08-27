import type { ApiVehicule } from "~/types/api";

// Type du contrat réel GET /v1/mobile/vehicules/mine, dérivé du contrat
// OpenAPI généré (chantier du 27/08/2026, voir types/api.ts) — sauf
// `en_livraison`, imperfection constatée : généré en `string` alors que la
// vraie valeur est un booléen (voir le rapport de ce chantier). Pas de
// pagination côté backend (collection complète) ; pas de statut "Entretien"
// dans le modèle ELM — seul `is_active` existe.
export type ClientVehicle = Omit<ApiVehicule, "en_livraison"> & { en_livraison: boolean };
