import type { ApiNotificationMarkReadResponse } from "../../../../../types/api";
import { callMonolith } from "../../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../../utils/authSession";

// POST /api/client/notifications/[id]/read (Nuxt) →
// POST /v1/mobile/notifications/{id}/read (Laravel, auth:sanctum seul —
// NotificationsController::markRead()) : 404 (jamais 403) si l'id n'appartient
// pas à l'utilisateur, même convention que CommandesController::show() —
// n'expose jamais si l'id existe pour un autre compte. Idempotent : un second
// appel sur une notification déjà lue ne fait rien de plus, mais renvoie
// toujours data/unread_count à jour (voir composables/useClientNotifications.ts
// ::markRead, qui adopte cet état canonique plutôt que sa mise à jour
// optimiste).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);
  const id = getRouterParam(event, "id");

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant de notification manquant." });
  }

  try {
    return await callMonolith<ApiNotificationMarkReadResponse>(`/api/v1/mobile/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
      token,
    });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
