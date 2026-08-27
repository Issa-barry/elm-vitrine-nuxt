import type { ApiUpdateProfileRequestBody } from "~/types/api";

// Types du contrat réel GET/PATCH /v1/mobile/profile côté elm-monolithe (voir
// docs/api-espace-client-contract.md côté backend, vérifié directement contre
// App\Http\Resources\Api\Client\ProfileResource et
// App\Http\Requests\Api\Client\UpdateProfileRequest le 26/08/2026). Ne PAS
// ajouter de champ ici sans l'avoir vérifié dans le code backend réel (pas de
// SIRET, pas de "quartier" séparé — n'existent pas dans le modèle ELM).
//
// IMPERFECTIONS OpenAPI CONSTATÉES (chantier "types OpenAPI" du 27/08/2026,
// voir types/generated/elm-api.ts) : les RÉPONSES de GET/PATCH
// /v1/mobile/profile sont générées en `unknown[]` (un TABLEAU) alors que la
// vraie forme est un OBJET `{user, profile}` — Scramble n'a pas su résoudre
// la forme réelle construite par ProfileController/UpdateProfileController.
// Le CORPS de requête PATCH /v1/mobile/profile/notification-preferences est
// lui aussi faux (`preferences: boolean[]` généré, la vraie forme est
// `{preferences: {activite: boolean}}`). Ces réponses/ce payload restent donc
// entièrement écrits à la main ci-dessous. Seul le corps de requête PATCH
// /v1/mobile/profile (UpdateProfileRequest, correctement typé) vient du
// contrat généré, voir UpdateClientProfileLocalisationPayload.
//
// Distinct de config/auth.ts::AuthUser/AuthContext (GET /api/auth/me) :
// /me porte l'identité minimale + session, /profile porte la fiche métier plus
// lourde (localisation, entreprise, préférences) — volontairement pas fusionnés
// dans un seul modèle (voir composables/useClientProfile.ts).

export type ClientProfileType = "proprietaire" | "client" | "livreur";

export interface ClientProfileIdentite {
  prenom: string | null;
  nom: string | null;
  surnom: string | null;
  nom_affichage: string | null;
}

export interface ClientProfileEntreprise {
  raison_sociale: string | null;
}

export interface ClientProfileContact {
  telephone: string | null;
  email: string | null;
}

export interface ClientProfileLocalisation {
  pays: string | null;
  code_pays: string | null;
  code_phone_pays: string | null;
  ville: string | null;
  adresse: string | null;
}

export interface ClientProfileNotifications {
  activite: boolean;
}

export interface ClientProfile {
  type: ClientProfileType;
  identite: ClientProfileIdentite;
  entreprise: ClientProfileEntreprise | null;
  contact: ClientProfileContact;
  localisation: ClientProfileLocalisation;
  actif: boolean;
  notifications: ClientProfileNotifications;
}

export interface ClientProfileResponse {
  user: { id: string | number; telephone: string | null; email: string | null };
  // null si le rôle client/proprietaire/livreur est présent sans fiche métier
  // réellement liée (cas limite mais possible côté backend — ProfileController
  // renvoie explicitement `profile: null` dans ce cas plutôt qu'une erreur).
  profile: ClientProfile | null;
}

// Seuls champs acceptés par PATCH /v1/mobile/profile (UpdateProfileRequest,
// dérivé du contrat OpenAPI généré — propre pour cette requête précise, voir
// types/api.ts) — identité civile, téléphone/email, raison sociale et statut
// restent réservés au backoffice, jamais envoyés depuis l'espace client.
export type UpdateClientProfileLocalisationPayload = ApiUpdateProfileRequestBody;

// PATCH /v1/mobile/profile/notification-preferences — payload et réponse ont
// une forme différente de GET/PATCH /profile (pas de wrapper "profile", cf.
// UpdateNotificationPreferencesController).
export interface UpdateNotificationPreferencesPayload {
  preferences: Partial<ClientProfileNotifications>;
}

export interface UpdateNotificationPreferencesResponse {
  notifications: ClientProfileNotifications;
}
