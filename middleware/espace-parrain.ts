import { resolveClientCapabilities } from "~/config/clientCapabilities";

// Pages /espace-client/parrain/* : à placer après "auth". Évite d'afficher ces
// écrans à un compte sans parrain, ce n'est pas la sécurité : Laravel répond
// 404 de lui-même (voir docs/api-espace-parrain-contract.md côté elm-monolithe).
export default defineNuxtRouteMiddleware(() => {
  const { context } = useAuth();

  if (!resolveClientCapabilities(context.value).parrain) {
    return navigateTo("/espace-client");
  }
});
