import type { ClientProfileResponse, UpdateClientProfileLocalisationPayload } from "../../../config/clientProfile";
import { callMonolith } from "../../utils/monolithClient";
import { getSessionToken } from "../../utils/authSession";

// PATCH /api/client/profile (Nuxt) → PATCH /v1/mobile/profile (Laravel).
// Seuls pays/code_pays/ville/adresse sont acceptés par UpdateProfileRequest
// côté backend (identité civile, téléphone/email, raison sociale et statut
// restent réservés au backoffice) — on relaie le body tel quel : c'est
// Laravel qui valide/filtre, jamais ce handler (une seule source de vérité
// pour la règle de champs modifiables, voir docs/api-espace-client-contract.md
// côté elm-monolithe).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const body = await readBody<UpdateClientProfileLocalisationPayload>(event);

  return await callMonolith<ClientProfileResponse>("/api/v1/mobile/profile", {
    method: "PATCH",
    token,
    body,
  });
});
