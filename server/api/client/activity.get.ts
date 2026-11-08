import type { ActivityQuery, ClientActivityResponse } from "../../../config/clientActivity";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/activity (Nuxt) → GET /v1/mobile/activite (Laravel,
// auth:sanctum, sans garde par rôle : ADR 0055). Liste unique « Commandes »
// (ADR 0058) : le périmètre et les données visibles sont décidés par le
// serveur selon les liens du compte — voir config/clientActivity.ts.
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
        lien: query.lien,
        vehicule_id: query.vehicule_id,
        periode: query.periode,
        annee: query.annee,
        mois: query.mois,
        quinzaine: query.quinzaine,
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
