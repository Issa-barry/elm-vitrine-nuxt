import type { ApiDashboardPeriod, ApiDashboardQuery, ApiDashboardResponse, ApiVehiculeEarningsRow } from "~/types/api";

// Formes HTTP dérivées du contrat OpenAPI généré (chantier du 27/08/2026,
// voir npm run api:types, types/api.ts, types/generated/elm-api.ts) — même
// moteur que le dashboard Inertia (ClientEarningsService), toujours vérifié
// contre le code réel avant migration. Les montants renvoyés ici sont LA
// source de vérité, jamais recalculés côté Nuxt (voir demande du 26/08/2026,
// section 30).
export type DashboardPeriod = ApiDashboardPeriod;
export type DashboardFilters = ApiDashboardResponse["filters"];
export type DashboardSummary = ApiDashboardResponse["summary"];
// Alias local historique : identique au schema OpenAPI `VehiculeEarningsRow`
// (voir types/api.ts) — conservé pour ne pas renommer tous les appelants
// existants (pages/espace-client/{index,commissions}.vue).
export type DashboardVehiculeBalance = ApiVehiculeEarningsRow;
export type DashboardVehiculeIdentity = ApiDashboardResponse["vehicules"][number];
export type ClientDashboardResponse = ApiDashboardResponse;

/** Requête vers GET /api/client/dashboard (BFF) — tous les filtres sont optionnels. */
export type DashboardQuery = ApiDashboardQuery;
