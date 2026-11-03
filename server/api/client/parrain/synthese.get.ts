import type { ParrainSynthese } from "../../../../config/clientParrain";
import { callMonolith } from "../../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../../utils/authSession";

// GET /api/client/parrain/synthese (Nuxt) → GET /v1/mobile/parrain/synthese
// (Laravel). Le parrain vient du compte authentifié, jamais d'un paramètre :
// voir docs/api-espace-parrain-contract.md côté elm-monolithe.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Non authentifié." });
  }

  try {
    return await callMonolith<ParrainSynthese>("/api/v1/mobile/parrain/synthese", { token });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
