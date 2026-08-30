import type { ClientDashboardResponse, DashboardQuery } from "../../../config/clientDashboard";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/dashboard (Nuxt) → GET /v1/mobile/dashboard (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Dashboard financier
// consolidé — même moteur (ClientEarningsService) que l'espace client
// Inertia, voir docs/api-espace-client-contract.md §5 côté elm-monolithe.
// Aucun agrégat recalculé ici : les 5 filtres (period/date_debut/date_fin/
// vehicule_id/statut) sont transmis tels quels, la réponse est retournée
// telle quelle.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as DashboardQuery;

  try {
    return await callMonolith<ClientDashboardResponse>("/api/v1/mobile/dashboard", {
      token,
      query: {
        period: query.period,
        date_debut: query.date_debut,
        date_fin: query.date_fin,
        vehicule_id: query.vehicule_id,
        statut: query.statut,
      },
    });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    // Même règle que server/api/client/profile.get.ts : 401 = token invalide
    // côté Laravel, session Nuxt invalidée. 403 = rôle refusé, jamais un
    // logout automatique.
    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
