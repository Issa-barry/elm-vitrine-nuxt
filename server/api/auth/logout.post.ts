import { callMonolith } from "../../utils/monolithClient";
import { clearAuthSession, getSessionToken } from "../../utils/authSession";

// POST /api/auth/logout (Nuxt) → POST /api/auth/logout (Laravel, auth:sanctum).
// Révoque uniquement le token courant (multi-device préservé : les autres
// appareils/clients de l'utilisateur restent connectés — voir
// docs/api-auth-contract.md côté elm-monolithe).
//
// Deux garanties distinctes, à ne jamais confondre (voir docs/environment.md) :
//   - la session Nuxt (ce cookie, ce navigateur) est TOUJOURS supprimée par
//     cette route, quoi qu'il arrive côté Laravel ;
//   - le token Sanctum n'est révoqué côté Laravel QUE si l'appel ci-dessous
//     réussit (`revokedRemotely`). S'il échoue (Laravel indisponible, token
//     déjà expiré...), ce token reste valide côté serveur jusqu'à son
//     expiration naturelle (SANCTUM_EXPIRATION_MINUTES) — l'utilisateur n'est
//     simplement plus authentifié DEPUIS CE NAVIGATEUR.
export default defineEventHandler(async (event) => {
  const token = await getSessionToken(event);
  let revokedRemotely = false;

  if (token) {
    try {
      await callMonolith("/api/auth/logout", { method: "POST", token });
      revokedRemotely = true;
    } catch (error) {
      // Ne jamais logger le token lui-même — seulement le fait de l'échec.
      // Le token est peut-être déjà invalide côté Laravel (double logout,
      // expiration...), mais un vrai backend indisponible doit rester visible
      // côté serveur plutôt que d'être avalé silencieusement.
      console.error("[auth] Échec de révocation du token Sanctum au logout (session Nuxt tout de même supprimée).", error);
    }
  } else {
    // Rien à révoquer côté Laravel (pas de session) : rien n'était non plus
    // "en attente" de révocation.
    revokedRemotely = true;
  }

  await clearAuthSession(event);

  return { message: "Déconnecté avec succès.", revokedRemotely };
});
