import { ACCUEIL_SANS_ACTIVITE, compteSansActivite } from "~/config/clientAccueil";
import { resolveClientCapabilities } from "~/config/clientCapabilities";
import { PARRAIN_SPACE_HOME } from "~/config/clientParrain";

// /espace-client : à placer après "auth". Un compte sans activité arrive sur
// l'accueil neutre (compte unique, ADR 0055 côté elm-monolithe). Un parrain
// seul n'a pas de tableau de bord propriétaire/livreur, son accueil est celui
// de son espace. Les autres comptes restent sur le tableau de bord habituel.
export default defineNuxtRouteMiddleware(() => {
  const { context } = useAuth();

  if (compteSansActivite(context.value)) {
    return navigateTo(ACCUEIL_SANS_ACTIVITE, { replace: true });
  }

  const capabilities = resolveClientCapabilities(context.value);

  if (capabilities.parrain && !capabilities.dashboard) {
    return navigateTo(PARRAIN_SPACE_HOME, { replace: true });
  }
});
