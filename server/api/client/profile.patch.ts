import type { UpdateClientProfilePayload, UpdateClientProfileResponse } from "../../../config/clientProfile";
import { callMonolith } from "../../utils/monolithClient";
import { getSessionToken } from "../../utils/authSession";

// PATCH /api/client/profile (Nuxt) → PATCH /v1/mobile/profile (Laravel).
// On relaie le body tel quel : c'est Laravel (UpdateProfileRequest) qui
// valide/filtre, jamais ce handler (une seule source de vérité pour la règle
// de champs modifiables, voir docs/api-espace-client-contract.md côté
// elm-monolithe).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const body = await readBody<UpdateClientProfilePayload>(event);

  return await callMonolith<UpdateClientProfileResponse>("/api/v1/mobile/profile", {
    method: "PATCH",
    token,
    body,
  });
});
