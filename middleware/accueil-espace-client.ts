import { resolveClientCapabilities } from "~/config/clientCapabilities";
import { PARRAIN_SPACE_HOME } from "~/config/clientParrain";

// /espace-client : à placer après "auth". Un parrain seul n'a pas de tableau de
// bord propriétaire/livreur, son accueil est celui de son espace. Les autres
// comptes restent sur le tableau de bord habituel.
export default defineNuxtRouteMiddleware(() => {
  const { context } = useAuth();
  const capabilities = resolveClientCapabilities(context.value);

  if (capabilities.parrain && !capabilities.dashboard) {
    return navigateTo(PARRAIN_SPACE_HOME, { replace: true });
  }
});
