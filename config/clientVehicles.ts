// Type du contrat réel GET /v1/mobile/vehicules/mine côté elm-monolithe (voir
// docs/api-espace-client-contract.md côté backend, vérifié directement contre
// App\Http\Controllers\Api\Client\VehiculesController le 26/08/2026). Pas de
// pagination côté backend (collection complète) ; pas de statut "Entretien"
// dans le modèle ELM — seul `is_active` existe.
export interface ClientVehicle {
  id: string;
  nom: string;
  immatriculation: string;
  type: string;
  // Colonne héritée côté backend, pas toujours alimentée (voir commentaire de
  // VehiculesController) — peut être null.
  capacite: number | null;
  is_active: boolean;
  photo_url: string | null;
  en_livraison: boolean;
  role: "proprietaire" | "livreur";
  // Nom du chauffeur assigné à l'équipe du véhicule ; null si aucun chauffeur
  // assigné — jamais un nom inventé.
  conducteur: string | null;
}
