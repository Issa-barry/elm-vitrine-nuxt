import type { ApiNotificationsMarkAllReadResponse } from "../../../../types/api";
import { callMonolith } from "../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../utils/authSession";

// POST /api/client/notifications/mark-all-read (Nuxt) →
// POST /v1/mobile/notifications/mark-all-read (Laravel, auth:sanctum seul —
// scopé à l'utilisateur, renvoie toujours unread_count: 0).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ApiNotificationsMarkAllReadResponse>("/api/v1/mobile/notifications/mark-all-read", {
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
