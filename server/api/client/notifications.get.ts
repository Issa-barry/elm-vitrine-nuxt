import type { ApiNotificationsQuery } from "../../../types/api";
import type { ClientNotificationsResponse } from "../../../config/clientNotifications";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/notifications (Nuxt) → GET /v1/mobile/notifications
// (Laravel, auth:sanctum SEUL — aucune garde de rôle, voir
// docs/api-espace-client-contract.md §7 côté elm-monolithe : accessible même
// à un compte staff pur). Pagination Laravel standard depuis le chantier
// backend du 27/08/2026 (voir types/api.ts::ApiNotificationsQuery pour la
// remarque sur `page`, absent du query généré mais lu par paginate()) — même
// convention que server/api/client/expenses.get.ts.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const query = getQuery(event) as ApiNotificationsQuery & { page?: number };

  try {
    return await callMonolith<ClientNotificationsResponse>("/api/v1/mobile/notifications", {
      token,
      query: { per_page: query.per_page, page: query.page },
    });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
