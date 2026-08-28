import type { ApiWebPushUnsubscribeResponse } from "../../../../types/api";
import { callMonolith } from "../../../utils/monolithClient";
import { getSessionToken } from "../../../utils/authSession";

// DELETE /api/client/web-push/subscriptions?endpoint=... (Nuxt) -> DELETE
// /v1/mobile/web-push/subscriptions?endpoint=... (Laravel) — `endpoint` en
// query string des deux côtés, jamais un corps JSON (voir
// WebPushSubscriptionDestroyRequest côté backend : support body-on-DELETE
// inégal selon clients/proxys). Toujours 200 même si l'abonnement n'existe
// déjà plus (idempotent) ; ne supprime que l'abonnement de CET endpoint,
// jamais un "delete all" — voir composables/useWebPush.ts::unsubscribe() /
// unlinkFromAccount().
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const { endpoint } = getQuery(event);

  if (!endpoint || typeof endpoint !== "string") {
    throw createError({ statusCode: 422, statusMessage: "Paramètre 'endpoint' requis." });
  }

  return await callMonolith<ApiWebPushUnsubscribeResponse>("/api/v1/mobile/web-push/subscriptions", {
    method: "DELETE",
    token,
    query: { endpoint },
  });
});
