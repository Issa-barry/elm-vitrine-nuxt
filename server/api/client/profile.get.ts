import type { ClientProfileResponse } from "../../../config/clientProfile";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/profile (Nuxt) → GET /v1/mobile/profile (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Fiche métier complète
// (localisation, entreprise, préférences) — distincte de /api/auth/me
// (identité minimale + session), voir docs/api-espace-client-contract.md
// côté elm-monolithe.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ClientProfileResponse>("/api/v1/mobile/profile", { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    // Même règle que server/api/auth/me.get.ts : un 401 signifie que le
    // token n'est plus valide côté Laravel (révoqué/expiré) — la session
    // Nuxt ne doit plus prétendre l'être. Un 403 (rôle refusé) reste
    // volontairement différent : ne jamais déconnecter automatiquement pour
    // un refus d'autorisation métier (voir docs/environment.md).
    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
