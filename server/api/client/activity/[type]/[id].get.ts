import type { ClientOperationDetail } from "../../../../../config/clientActivity";
import { callMonolith } from "../../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../../utils/authSession";

// GET /api/client/activity/{type}/{id} (Nuxt) → GET /v1/mobile/activite/{type}/{id}
// (Laravel, ADR 0058). Le type est vérifié ici pour ne jamais relayer un chemin
// arbitraire ; le périmètre reste décidé par le serveur, qui répond 404 hors du compte.
const TYPES = new Set(["vente", "logistique"]);

export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  const type = getRouterParam(event, "type") ?? "";
  const id = getRouterParam(event, "id") ?? "";

  if (!TYPES.has(type) || !id) {
    throw createError({ statusCode: 404, statusMessage: "Opération introuvable." });
  }

  try {
    return await callMonolith<{ data: ClientOperationDetail }>(`/api/v1/mobile/activite/${type}/${encodeURIComponent(id)}`, { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    if (fetchError.statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
