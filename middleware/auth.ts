// Protège /espace-client/* (voir definePageMeta({ middleware: "auth" }) sur
// chaque page du dossier) : redirige vers /connexion si aucune session
// valide n'est trouvée via GET /api/auth/me (composables/useAuth.ts). Tout
// compte actif entre, quels que soient ses rôles et ses activités (compte
// unique, ADR 0055 côté elm-monolithe) : un compte désactivé perd déjà sa
// session côté Laravel (403 sur /me).
//
// Actif dans TOUS les environnements, y compris `nuxt dev` — décision du
// 26/08/2026 : aucun bypass d'auth runtime, même en développement local
// (voir docs/environment.md). Le développeur qui lance `nuxt dev` doit avoir
// un `elm-monolithe` local joignable (NUXT_MONOLITH_API_BASE) pour utiliser
// l'espace client ; sans backend disponible, cette route redirige vers
// /connexion avec une erreur explicite, elle ne se dégrade jamais en accès
// silencieux. Les tests E2E qui ont besoin d'atteindre ces pages passent par
// une vraie connexion contre le mock backend dédié (voir
// tests/e2e/mock-backend.mjs et playwright.config.ts).
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth();
  await auth.ensureFetched();

  if (!auth.isAuthenticated.value) {
    return navigateTo("/connexion");
  }
});
