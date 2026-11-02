import type { ActivityQuery, ClientActivityResponse } from "~/config/clientActivity";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Historique d'activité (GET /v1/mobile/activite, via
// server/api/client/activity.get.ts) — ventes + transferts logistiques, tous
// statuts, pagination Laravel standard. Voir config/clientActivity.ts.
export function useClientActivity() {
  const response = useState<ClientActivityResponse | null>("client:activity", () => null);
  const isLoading = useState<boolean>("client:activity:loading", () => false);
  const error = useState<AuthErrorInfo | null>("client:activity:error", () => null);
  const hasLoaded = useState<boolean>("client:activity:hasLoaded", () => false);
  const requestFetch = useRequestFetch();

  async function fetchActivity(query: ActivityQuery = {}): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      response.value = await requestFetch<ClientActivityResponse>("/api/client/activity", { query });
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      response.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return { response, isLoading, error, hasLoaded, fetchActivity };
}
