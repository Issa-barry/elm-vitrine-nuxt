import type { ApiParrainVehiculesResponse } from "../../../../types/api";
import { callMonolith } from "../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../utils/authSession";

// GET /api/client/parrain/vehicules (Nuxt) → GET /v1/mobile/parrain/vehicules
// (Laravel) : véhicules parrainés actuellement et parts du parrain, voir
// docs/api-espace-parrain-contract.md côté elm-monolithe.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ApiParrainVehiculesResponse>("/api/v1/mobile/parrain/vehicules", { token });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
