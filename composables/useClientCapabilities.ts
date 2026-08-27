import type { ClientCapabilities } from "~/config/clientCapabilities";
import { resolveClientCapabilities } from "~/config/clientCapabilities";
import { CLIENT_CAPABILITIES_PREVIEW_FIXTURES, isClientCapabilitiesPreviewScenario } from "~/config/clientCapabilitiesFixtures";

// Source unique des capacités UI pour toute la navigation espace client
// (ClientMenu.vue, ClientMobileBottomNav.vue) — voir config/
// clientCapabilities.ts. Sur une route de preview UI (pages/_preview/
// espace-client/[scenario].vue, dev uniquement), résout depuis les fixtures
// plutôt que depuis la session réelle : ni ClientMenu.vue ni
// ClientMobileBottomNav.vue n'ont besoin de savoir que la preview existe,
// évite tout provide/inject à travers la frontière layout/page (le layout
// "client" n'est pas un ancêtre Vue de la page — un provide() posé dans la
// page n'atteindrait jamais un inject() dans ces composants).
export function useClientCapabilities() {
  const route = useRoute();
  const auth = useAuth();

  return computed<ClientCapabilities>(() => {
    const scenario = route.params.scenario;
    if (import.meta.dev && typeof scenario === "string" && isClientCapabilitiesPreviewScenario(scenario)) {
      return CLIENT_CAPABILITIES_PREVIEW_FIXTURES[scenario].capabilities;
    }
    return resolveClientCapabilities(auth.context.value);
  });
}
