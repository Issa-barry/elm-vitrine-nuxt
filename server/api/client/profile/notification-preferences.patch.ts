import type {
  UpdateNotificationPreferencesPayload,
  UpdateNotificationPreferencesResponse,
} from "../../../../config/clientProfile";
import { callMonolith } from "../../../utils/monolithClient";
import { getSessionToken } from "../../../utils/authSession";

// PATCH /api/client/profile/notification-preferences (Nuxt) → PATCH
// /v1/mobile/profile/notification-preferences (Laravel). Forme différente de
// profile.patch.ts : body `{preferences: {...}}`, réponse `{notifications: {...}}`
// sans wrapper "profile" (voir UpdateNotificationPreferencesController côté
// backend) — préférence persistée en base, jamais dans localStorage/useState
// seul côté Nuxt.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const body = await readBody<UpdateNotificationPreferencesPayload>(event);

  return await callMonolith<UpdateNotificationPreferencesResponse>(
    "/api/v1/mobile/profile/notification-preferences",
    { method: "PATCH", token, body },
  );
});
