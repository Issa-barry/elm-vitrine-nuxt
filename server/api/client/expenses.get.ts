import type { ClientExpensesResponse, ExpensesQuery } from "../../../config/clientExpenses";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/expenses (Nuxt) → GET /v1/mobile/depenses/mine (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Version consolidée (tous
// véhicules accessibles), pagination Laravel standard — voir
// docs/api-espace-client-contract.md §4 côté elm-monolithe.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as ExpensesQuery;

  try {
    return await callMonolith<ClientExpensesResponse>("/api/v1/mobile/depenses/mine", {
      token,
      query: {
        vehicule_id: query.vehicule_id,
        depense_type_id: query.depense_type_id,
        statut: query.statut,
        date_debut: query.date_debut,
        date_fin: query.date_fin,
        per_page: query.per_page,
        page: query.page,
      },
    });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
