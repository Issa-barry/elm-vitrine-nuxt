export type LandingAuthState = "loading" | "authenticated" | "guest";

// Résout l'état d'authentification de la vitrine publique en 3 états
// explicites (chantier "header auth" du 27/08/2026) — partagé entre
// components/landing/Navbar.vue ET Hero.vue (les deux affichent des CTA
// Connexion/Inscription qui doivent devenir "Mon espace" pour un compte déjà
// authentifié — Hero.vue les affiche sur mobile même hamburger fermé,
// distinct du header). La résolution elle-même (ensureFetched()) a lieu
// dans middleware/session.global.ts, AVANT le rendu de tout composant — ce
// composable ne fait que dériver l'état d'affichage depuis
// composables/useAuth.ts, jamais un second mécanisme d'auth.
export function useLandingAuthState() {
  const auth = useAuth();
  return computed<LandingAuthState>(() => {
    if (auth.status.value === "idle" || auth.status.value === "loading") return "loading";
    return auth.isAuthenticated.value ? "authenticated" : "guest";
  });
}
