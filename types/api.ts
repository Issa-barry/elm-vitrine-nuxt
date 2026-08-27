import type { components, operations } from "./generated/elm-api";

// Alias lisibles vers le contrat OpenAPI généré (chantier du 27/08/2026) —
// types/generated/elm-api.ts est AUTO-GÉNÉRÉ (voir npm run api:types,
// openapi/elm-client.json) et ne doit jamais être édité ni importé
// directement ailleurs dans l'app : tout accès passe par CE fichier, pour
// n'avoir qu'un seul endroit à ajuster si openapi-typescript change sa forme
// de sortie un jour.
//
// Ne contient QUE la forme HTTP (requêtes/réponses Laravel réelles). Les
// types UI (ViewModels, filtres avec sentinel "tous", types dérivés pour
// l'affichage...) restent dans config/*.ts, volontairement séparés — voir
// config/clientDashboard.ts, clientExpenses.ts, etc. pour la distinction.

// ── Auth ─────────────────────────────────────────────────────────────────
export type ApiLoginRequestBody = NonNullable<operations["auth.login"]["requestBody"]>["content"]["application/json"];
export type ApiLoginResponse = operations["auth.login"]["responses"][200]["content"]["application/json"];
export type ApiMeResponse = operations["auth.me"]["responses"][200]["content"]["application/json"];

// ── Dashboard ────────────────────────────────────────────────────────────
export type ApiDashboardResponse = operations["client.dashboard.mine"]["responses"][200]["content"]["application/json"];
export type ApiDashboardQuery = NonNullable<operations["client.dashboard.mine"]["parameters"]["query"]>;
// Union réellement fermée du paramètre `period`, directement extraite du
// contrat — plus précise que le type de la réponse `filters.period`
// (`string | "ce_mois"`, un artefact Scramble/openapi-typescript non
// représentatif du vrai contrat de requête, voir Rule::in(...) côté
// ClientEarningsService::resolveFilters()).
export type ApiDashboardPeriod = NonNullable<ApiDashboardQuery["period"]>;
export type ApiVehiculeEarningsRow = ApiDashboardResponse["par_vehicule"][number];

// ── Profil ───────────────────────────────────────────────────────────────
export type ApiProfileResponse = operations["client.profile.mine"]["responses"][200]["content"]["application/json"];
export type ApiUpdateProfileRequestBody = NonNullable<operations["client.profile.update"]["requestBody"]>["content"]["application/json"];
export type ApiUpdateProfileResponse = operations["client.profile.update"]["responses"][200]["content"]["application/json"];
export type ApiUpdateNotificationPreferencesRequestBody =
  NonNullable<operations["client.profile.notification-preferences"]["requestBody"]>["content"]["application/json"];
export type ApiUpdateNotificationPreferencesResponse =
  operations["client.profile.notification-preferences"]["responses"][200]["content"]["application/json"];

// ── Véhicules ────────────────────────────────────────────────────────────
export type ApiVehiculesMineResponse = operations["client.vehicules.mine"]["responses"][200]["content"]["application/json"];
export type ApiVehicule = ApiVehiculesMineResponse[number];
export type ApiVehiculeCommissionsResponse = operations["client.vehicules.commissions"]["responses"][200]["content"]["application/json"];
// Référence directe au schema nommé plutôt qu'un indexage `[number]` sur
// ApiVehiculeCommissionsResponse (un union `VehiculeCommissionRow[] | []`
// côté OpenAPI, pour représenter le cas "aucun contexte proprietaire/livreur"
// — indexer un union de tableaux ainsi cassait le spread `{ ...row }` dans
// useClientCommissions.ts, TypeScript ne simplifiant pas proprement le
// résultat).
export type ApiVehiculeCommissionRow = components["schemas"]["VehiculeCommissionRow"];

// ── Dépenses ─────────────────────────────────────────────────────────────
export type ApiDepensesMineResponse = operations["client.depenses.mine"]["responses"][200]["content"]["application/json"];
export type ApiDepensesQuery = NonNullable<operations["client.depenses.mine"]["parameters"]["query"]>;

// ── Activité ─────────────────────────────────────────────────────────────
export type ApiActiviteResponse = operations["client.activite.mine"]["responses"][200]["content"]["application/json"];
export type ApiActiviteQuery = NonNullable<operations["client.activite.mine"]["parameters"]["query"]>;
// OpenAPI ne peut pas exprimer "statut nécessite type" (règle inter-champs,
// voir ActiviteMineRequest côté elm-monolithe) — cette contrainte reste
// documentée en commentaire, jamais dans un type (voir config/
// clientActivity.ts).

// ── Commandes (rôle client) ──────────────────────────────────────────────
export type ApiCommandesMineResponse = operations["client.commandes.mine"]["responses"][200]["content"]["application/json"];
export type ApiCommandeDetailResponse = operations["client.commandes.show"]["responses"][200]["content"]["application/json"];

// ── Propositions de véhicule ─────────────────────────────────────────────
export type ApiPropositionsVehiculeResponse = operations["client.propositions-vehicules.index"]["responses"][200]["content"]["application/json"];
// multipart/form-data (upload photo) — jamais application/json, voir
// StoreVehicleProposalRequest côté elm-monolithe.
export type ApiStoreVehicleProposalRequestBody =
  operations["client.propositions-vehicules.store"]["requestBody"]["content"]["multipart/form-data"];
export type ApiStoreVehicleProposalResponse = operations["client.propositions-vehicules.store"]["responses"][201]["content"]["application/json"];

// ── Notifications ────────────────────────────────────────────────────────
export type ApiNotificationsResponse = operations["client.notifications.index"]["responses"][200]["content"]["application/json"];
export type ApiNotificationsMarkAllReadResponse = operations["client.notifications.mark-all-read"]["responses"][200]["content"]["application/json"];
