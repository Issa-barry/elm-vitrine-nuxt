import type { CommissionsCompteQuery, CommissionsCompteResponse } from "../../../config/clientCommissionsCompte";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/commissions (Nuxt) → GET /v1/mobile/commissions (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Détail des commissions du
// compte, toutes activités (ADR 0054 côté elm-monolithe). Filtres transmis tels
// quels, réponse retournée telle quelle.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as CommissionsCompteQuery;

  try {
    return await callMonolith<CommissionsCompteResponse>("/api/v1/mobile/commissions", {
      token,
      query: {
        periode: query.periode,
        annee: query.annee,
        mois: query.mois,
        quinzaine: query.quinzaine,
        date_debut: query.date_debut,
        date_fin: query.date_fin,
        vehicule_id: query.vehicule_id,
        activite: query.activite,
        statut: query.statut,
        recherche: query.recherche,
        per_page: query.per_page,
        page: query.page,
      },
    });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    // 401 = token invalide côté Laravel, session Nuxt invalidée ; 403 = rôle refusé, jamais un logout.
    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
