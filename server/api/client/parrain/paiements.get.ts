import type { ParrainPaiementsQuery, ParrainPaiementsResponse } from "../../../../config/clientParrain";
import { callMonolith } from "../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../utils/authSession";

// GET /api/client/parrain/paiements (Nuxt) → GET /v1/mobile/parrain/paiements
// (Laravel). Seuls les filtres du contrat sont transmis : aucun identifiant de
// parrain ne peut passer, voir docs/api-espace-parrain-contract.md côté elm-monolithe.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as ParrainPaiementsQuery;

  try {
    return await callMonolith<ParrainPaiementsResponse>("/api/v1/mobile/parrain/paiements", {
      token,
      query: {
        date_debut: query.date_debut,
        date_fin: query.date_fin,
        per_page: query.per_page,
        page: query.page,
      },
    });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
