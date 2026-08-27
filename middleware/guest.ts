// Évite d'afficher /connexion à un utilisateur déjà authentifié (renvoyé
// vers /espace-client à la place). Actif dans tous les environnements — voir
// le commentaire de middleware/auth.ts pour le détail de cette décision.
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth();
  await auth.ensureFetched();

  if (auth.isAuthenticated.value) {
    return navigateTo("/espace-client");
  }
});
