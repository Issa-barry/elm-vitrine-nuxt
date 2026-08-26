import type { ClientDashboardResponse, DashboardQuery } from "~/config/clientDashboard";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Dashboard financier consolidé (GET /v1/mobile/dashboard, via
// server/api/client/dashboard.get.ts) — même moteur que l'espace client
// Inertia (ClientEarningsService). Ne recalcule jamais un montant côté Nuxt :
// summary/par_vehicule/vehicules sont affichés tels que renvoyés par le
// backend (voir demande du 26/08/2026, section 30).
export function useClientDashboard() {
  const dashboard = useState<ClientDashboardResponse | null>("client:dashboard", () => null);
  const isLoading = useState<boolean>("client:dashboard:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:dashboard:error", () => null);
  // useRequestFetch() plutôt qu'un ofetch importé brut : voir le commentaire
  // équivalent dans composables/useAuth.ts (résolution d'URL relative +
  // transmission du cookie de session côté SSR).
  const requestFetch = useRequestFetch();

  async function fetchDashboard(query: DashboardQuery = {}): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      dashboard.value = await requestFetch<ClientDashboardResponse>("/api/client/dashboard", { query });
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      dashboard.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return { dashboard, isLoading, error, fetchDashboard };
}
