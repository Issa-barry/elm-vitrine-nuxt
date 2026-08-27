import type { ApiVehicule } from "~/types/api";

// Membre d'équipe (véhicule.equipe[]) — `role` est la valeur RÉELLE stockée
// en base côté elm-monolithe (`chauffeur`/`convoyeur`), jamais traduite par
// le backend : c'est au frontend de choisir un libellé (voir
// vehicleTeamRoleLabel ci-dessous), jamais au backend d'inventer une
// taxonomie parallèle (vérifié dans App\Http\Controllers\Api\Client\
// VehiculesController::equipeData(), 27/08/2026 — ne renvoie que les
// membres actifs, filtré côté backend).
export interface ClientVehicleTeamMember {
  id: string;
  nom_complet: string;
  telephone: string | null;
  role: string;
  ordre: number;
}

// Capacité par catégorie produit (véhicule.capacites[]) — seule source de
// vérité de la capacité réelle (VehiculeCapacite), jamais le champ hérité
// `capacite` (toujours vide en pratique, conservé pour compatibilité
// descendante uniquement).
export interface ClientVehicleCapacity {
  categorie_id: string;
  categorie: string | null;
  capacite: number;
}

export interface ClientVehicleOwner {
  id: string;
  nom_complet: string;
  telephone: string | null;
}

// Type du contrat réel GET /v1/mobile/vehicules/mine, dérivé du contrat
// OpenAPI généré (chantier du 27/08/2026, voir types/api.ts) — sauf
// `en_livraison`, imperfection constatée : généré en `string` alors que la
// vraie valeur est un booléen (voir le rapport de ce chantier). Pas de
// pagination côté backend (collection complète) ; pas de statut "Entretien"
// dans le modèle ELM — seul `is_active` existe.
//
// `statut`/`proprietaire`/`equipe`/`capacites` : AJOUTÉS AU BACKEND le
// 27/08/2026 (App\Http\Controllers\Api\Client\VehiculesController, vérifié
// directement dans le code + tests\Feature\Api\Client\
// VehiculesControllerTest.php, 11 tests) mais PAS ENCORE dans le contrat
// OpenAPI généré (docs/openapi/client.json côté elm-monolithe non
// régénéré au moment de cette migration — `ApiVehicule` ne les connaît pas
// encore) : ajoutés ici à la main en attendant. `conducteur`/`capacite`
// restent dans `ApiVehicule` tels quels pour compatibilité descendante mais
// ne doivent plus être lus pour l'affichage détaillé — `equipe[]` et
// `capacites[]` sont désormais les sources canoniques (voir le commentaire
// du contrôleur backend). À retirer cette extension manuelle une fois
// `npm run api:sync-spec && npm run api:types` relancé après régénération
// du contrat côté elm-monolithe.
export type ClientVehicle = Omit<ApiVehicule, "en_livraison"> & {
  en_livraison: boolean;
  statut: "actif" | "inactif";
  proprietaire: ClientVehicleOwner | null;
  equipe: ClientVehicleTeamMember[];
  capacites: ClientVehicleCapacity[];
};

// Libellé d'affichage — le backend ne traduit jamais `role` (valeur brute
// chauffeur/convoyeur). Repli sur la valeur brute capitalisée pour un rôle
// futur non encore connu ici, jamais une erreur d'affichage.
const TEAM_ROLE_LABELS: Record<string, string> = {
  chauffeur: "Chauffeur",
  convoyeur: "Convoyeur",
};

export function vehicleTeamRoleLabel(role: string): string {
  return TEAM_ROLE_LABELS[role] ?? (role.charAt(0).toUpperCase() + role.slice(1));
}
