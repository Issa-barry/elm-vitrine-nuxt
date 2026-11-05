import type { ClientVehicleRattache } from "../../../../config/clientVehicles";
import { callMonolith } from "../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../utils/authSession";

// GET /api/client/vehicles/rattaches (Nuxt) → GET /v1/mobile/vehicules/rattaches
// (Laravel, ADR 0054) : tous les véhicules rattachés au compte (propriétaire,
// livreur, parrain), un véhicule seulement parrainé en lecture restreinte.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ClientVehicleRattache[]>("/api/v1/mobile/vehicules/rattaches", { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
