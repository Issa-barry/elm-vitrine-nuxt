import type { ActivityQuery, ClientActivityResponse } from "~/config/clientActivity";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Historique d'activité (GET /v1/mobile/activite, via
// server/api/client/activity.get.ts) — ventes + transferts logistiques, tous
// statuts, pagination Laravel standard. Voir config/clientActivity.ts.
export function useClientActivity() {
  const response = useState<ClientActivityResponse | null>("client:activity", () => null);
  const isLoading = useState<boolean>("client:activity:loading", () => false);
  const isLoadingMore = useState<boolean>("client:activity:loadingMore", () => false);
  const error = useState<AuthErrorInfo | null>("client:activity:error", () => null);
  const loadMoreError = useState<AuthErrorInfo | null>("client:activity:loadMoreError", () => null);
  const hasLoaded = useState<boolean>("client:activity:hasLoaded", () => false);
  // Dernière requête lancée : loadMore() y réapplique les mêmes filtres, et une
  // réponse lente d'un ancien filtre ne remplace jamais celle du filtre courant.
  const lastQuery = useState<ActivityQuery>("client:activity:query", () => ({}));
  const requestSeq = useState<number>("client:activity:seq", () => 0);
  const requestFetch = useRequestFetch();

  const hasMore = computed(() => {
    const meta = response.value?.meta;
    return Boolean(meta && meta.current_page < meta.last_page);
  });

  async function fetchActivity(query: ActivityQuery = {}): Promise<boolean> {
    const seq = ++requestSeq.value;
    lastQuery.value = query;
    isLoading.value = true;
    isLoadingMore.value = false;
    error.value = null;
    loadMoreError.value = null;
    try {
      const result = await requestFetch<ClientActivityResponse>("/api/client/activity", { query });
      if (seq !== requestSeq.value) return false;
      response.value = result;
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      if (seq !== requestSeq.value) return false;
      error.value = normalizeAuthError(fetchError);
      response.value = null;
      return false;
    } finally {
      if (seq === requestSeq.value) isLoading.value = false;
    }
  }

  // Concatène la page suivante en dédupliquant par `id`, comme
  // useClientNotifications.ts. Un échec laisse la liste déjà chargée affichée.
  async function loadMore(): Promise<boolean> {
    if (!hasMore.value || isLoading.value || isLoadingMore.value) return true;

    const seq = requestSeq.value;
    const page = (response.value?.meta.current_page ?? 1) + 1;
    isLoadingMore.value = true;
    loadMoreError.value = null;
    try {
      const result = await requestFetch<ClientActivityResponse>("/api/client/activity", { query: { ...lastQuery.value, page } });
      if (seq !== requestSeq.value || !response.value) return false;
      const knownIds = new Set(response.value.data.map((item) => item.id));
      response.value = { ...result, data: [...response.value.data, ...result.data.filter((item) => !knownIds.has(item.id))] };
      return true;
    } catch (fetchError) {
      if (seq !== requestSeq.value) return false;
      loadMoreError.value = normalizeAuthError(fetchError);
      return false;
    } finally {
      if (seq === requestSeq.value) isLoadingMore.value = false;
    }
  }

  return { response, isLoading, isLoadingMore, error, loadMoreError, hasLoaded, hasMore, fetchActivity, loadMore };
}
