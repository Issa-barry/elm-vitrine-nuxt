import type { ApiWebPushSubscribeRequestBody, ApiWebPushSubscribeResponse } from "../../../../types/api";
import { callMonolith } from "../../../utils/monolithClient";
import { getSessionToken } from "../../../utils/authSession";

// POST /api/client/web-push/subscriptions (Nuxt) -> POST
// /v1/mobile/web-push/subscriptions (Laravel). Idempotent côté backend
// (upsert par endpoint, voir WebPushSubscriptionsController::store()) —
// rappelable sans risque à chaque connexion pour resynchroniser
// silencieusement (voir composables/useWebPush.ts::syncSubscription()).
// Le serveur associe TOUJOURS l'abonnement à $request->user() : ce body ne
// contient jamais d'identifiant de compte, uniquement endpoint/keys.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const body = await readBody<ApiWebPushSubscribeRequestBody>(event);

  return await callMonolith<ApiWebPushSubscribeResponse>("/api/v1/mobile/web-push/subscriptions", {
    method: "POST",
    token,
    body,
  });
});
