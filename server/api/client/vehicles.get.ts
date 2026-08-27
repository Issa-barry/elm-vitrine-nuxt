import type { ClientVehicle } from "../../../config/clientVehicles";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// GET /api/client/vehicles (Nuxt) → GET /v1/mobile/vehicules/mine (Laravel,
// auth:sanctum + role:client|proprietaire|livreur). Collection complète, pas
// de pagination côté backend (voir docs/api-espace-client-contract.md côté
// elm-monolithe).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ClientVehicle[]>("/api/v1/mobile/vehicules/mine", { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    // Même règle que server/api/client/profile.get.ts : 401 = token invalide
    // côté Laravel, session Nuxt invalidée. 403 = rôle refusé, jamais un
    // logout automatique.
    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
