import { callMonolith } from "../../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../../utils/authSession";

// POST /api/client/notifications/[id]/read (Nuxt) →
// POST /v1/mobile/notifications/{id}/read (Laravel, auth:sanctum seul —
// NotificationsController::markRead(), idempotent : ne fait rien si déjà lue
// ou si l'id n'appartient pas à l'utilisateur).
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
    return await callMonolith<{ success: boolean }>(`/api/v1/mobile/notifications/${encodeURIComponent(id)}/read`, {
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
