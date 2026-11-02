import type { AuthContext, AuthUser } from "../../../config/auth";
import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

interface MeUpstreamResponse extends AuthUser {
  context: AuthContext;
}

// GET /api/auth/me (Nuxt) → GET /api/auth/me (Laravel, auth:sanctum). Source
// de restauration de session après F5/navigation directe/SSR (voir
// composables/useAuth.ts) : le frontend ne doit jamais déduire un état
// "connecté" uniquement d'un état Vue en mémoire.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);

  if (!token) {
    // code: "no_session" — distingue ce cas (aucun cookie, visite anonyme
    // normale) d'un token existant rejeté par le back plus bas (vraie perte
    // de session) : composables/useAuth.ts::refreshMe() n'affiche le message
    // d'erreur sur pages/connexion.vue que dans ce second cas.
    throw createError({ statusCode: 401, statusMessage: "Non authentifié.", data: { code: "no_session" } });
  }

  try {
    return await callMonolith<MeUpstreamResponse>("/api/auth/me", { token });
  } catch (error) {
    const fetchError = error as { statusCode?: number };

    // Token révoqué/expiré, ou compte désactivé après l'émission du token
    // (filet de sécurité EnsureApiAccountIsActive côté backend) : la session
    // Nuxt ne doit plus prétendre être valide au prochain appel.
    if (fetchError.statusCode === 401 || fetchError.statusCode === 403) {
      await clearAuthSession(event);
    }

    throw error;
  }
});
