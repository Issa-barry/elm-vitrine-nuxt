import type { ClientNotificationsResponse } from "../../../config/clientNotifications";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/notifications (Nuxt) → GET /v1/mobile/notifications
// (Laravel, auth:sanctum SEUL — aucune garde de rôle, voir
// docs/api-espace-client-contract.md §7 côté elm-monolithe : accessible même
// à un compte staff pur).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ClientNotificationsResponse>("/api/v1/mobile/notifications", { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
