// Middleware global (suffixe .global.ts : s'applique à TOUTE navigation sans
// definePageMeta, y compris la vitrine publique) — chantier "header auth" du
// 27/08/2026. Résout le statut de session AVANT le rendu de n'importe quelle
// page, jamais une redirection (voir middleware/auth.ts/guest.ts pour ça) :
// uniquement une résolution de statut idempotente. ensureFetched() ne
// refait rien si le statut est déjà connu (voir composables/useAuth.ts,
// même garde `status.value === "idle"`) — un seul appel /api/auth/me par
// session de navigation, exécuté ici en premier (les middlewares globaux
// s'exécutent avant les middlewares nommés), que la 1re page visitée soit
// publique ou privée.
//
// Élimine le flash "Connexion/Inscription" -> "Mon espace" (et l'inverse) au
// premier rendu : sans ce middleware, la résolution ne pourrait se faire que
// côté client (onMounted, jamais pendant le SSR), donc toujours après le
// premier paint.
export default defineNuxtRouteMiddleware(async (to) => {
  // /dev-preview/* (chantier "capacités prestataire" du 27/08/2026, voir
  // pages/dev-preview/espace-client/) doit rester STRICTEMENT indépendant de
  // l'auth réelle — aucun appel API, pas même /me — exclu explicitement ici,
  // sinon ce middleware global le déclencherait sur chaque visite.
  if (to.path.startsWith("/dev-preview")) return;

  await useAuth().ensureFetched();
});
