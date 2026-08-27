import type { VehicleCommission } from "../../../../../config/clientCommissions";
import { callMonolith } from "../../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../../utils/authSession";

// GET /api/client/vehicles/:id/commissions (Nuxt) →
// GET /v1/mobile/vehicules/:id/commissions (Laravel, auth:sanctum +
// role:client|proprietaire|livreur). Scopé à un seul véhicule — voir
// config/clientCommissions.ts et composables/useClientCommissions.ts pour la
// façon dont /espace-client/commissions assemble plusieurs véhicules.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const vehiculeId = getRouterParam(event, "id");
  if (!vehiculeId) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant de véhicule manquant." });
  }

  try {
    return await callMonolith<VehicleCommission[]>(`/api/v1/mobile/vehicules/${vehiculeId}/commissions`, { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
