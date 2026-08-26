import type { ActivityQuery, ClientActivityResponse } from "../../../config/clientActivity";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/activity (Nuxt) → GET /v1/mobile/activite (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Historique complet
// (ventes + transferts logistiques, tous statuts) — voir
// docs/api-espace-client-contract.md §5 côté elm-monolithe. `statut` n'est
// volontairement pas transmis ici : le backend l'exige accompagné de `type`
// (422 sinon), voir config/clientActivity.ts.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as ActivityQuery;

  try {
    return await callMonolith<ClientActivityResponse>("/api/v1/mobile/activite", {
      token,
      query: {
        type: query.type,
        vehicule_id: query.vehicule_id,
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
