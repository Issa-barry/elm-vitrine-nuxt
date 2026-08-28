import type { ApiWebPushVapidPublicKeyResponse } from "../../../../types/api";
import { callMonolith } from "../../../utils/monolithClient";
import { getSessionToken } from "../../../utils/authSession";

// GET /api/client/web-push/vapid-public-key (Nuxt) -> GET
// /v1/mobile/web-push/vapid-public-key (Laravel). `public_key: null` est une
// réponse NORMALE (canal Web Push pas encore configuré côté serveur, voir
// config/webPush.ts::resolveWebPushState) — jamais transformée en erreur ici.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  return await callMonolith<ApiWebPushVapidPublicKeyResponse>("/api/v1/mobile/web-push/vapid-public-key", { token });
});
