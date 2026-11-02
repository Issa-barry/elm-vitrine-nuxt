import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// POST /api/auth/logout-all (Nuxt) → POST /api/auth/logout-all (Laravel,
// auth:sanctum). Révoque TOUS les tokens de l'utilisateur (tous appareils).
// Pas encore exposé dans l'UI à ce stade (voir composables/useAuth.ts) :
// couche API prête pour un futur écran "Sécurité" (docs/api-auth-contract.md).
//
// Contrairement à logout.post.ts, l'échec de l'appel distant N'EST PAS anodin
// ici : l'objectif métier explicite de cette route est "déconnecter TOUS les
// appareils", pas seulement celui-ci. Si Laravel échoue, les autres appareils
// restent connectés — le message renvoyé doit le refléter honnêtement plutôt
// que d'affirmer un succès non confirmé (voir tests/e2e — comportement vérifié
// explicitement).
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);
  let revokedRemotely = false;

  if (token) {
    try {
      await callMonolith("/api/auth/logout-all", { method: "POST", token });
      revokedRemotely = true;
    } catch (error) {
      // Ne jamais logger le token lui-même — seulement le fait de l'échec.
      console.error("[auth] Échec de révocation de tous les tokens Sanctum au logout-all (session Nuxt tout de même supprimée ici).", error);
    }
  } else {
    // Rien à révoquer côté Laravel depuis cette session : rien n'était non
    // plus "en attente" de révocation.
    revokedRemotely = true;
  }

  await clearAuthSession(event);

  return {
    message: revokedRemotely
      ? "Déconnecté de tous les appareils."
      : "Votre session a été fermée sur cet appareil, mais la déconnexion des autres appareils n'a pas pu être confirmée auprès du serveur. Réessayez plus tard.",
    revokedRemotely,
  };
});
