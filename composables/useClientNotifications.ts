import type { ApiNotificationMarkReadResponse, ApiNotificationsMarkAllReadResponse } from "~/types/api";
import type { ClientNotification, ClientNotificationsResponse } from "~/config/clientNotifications";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

type NotificationsMeta = ClientNotificationsResponse["meta"];

// Notifications reçues (GET /v1/mobile/notifications) — distinct des
// PRÉFÉRENCES de notification (useClientProfile.ts::updateNotificationPreference,
// PATCH /v1/mobile/profile/notification-preferences) : voir
// docs/api-espace-client-contract.md §7 côté elm-monolithe, ne jamais mélanger
// les deux. État découpé en plusieurs useState (items/meta/unreadCount) plutôt
// qu'un objet `notifications` unique (contrat désormais paginé, migration du
// 28/08/2026) : `loadMore()` doit pouvoir concaténer `items` sans reconstruire
// tout l'objet réponse.
export function useClientNotifications() {
  const items = useState<ClientNotification[]>("client:notifications:items", () => []);
  const meta = useState<NotificationsMeta | null>("client:notifications:meta", () => null);
  const unreadCount = useState<number>("client:notifications:unreadCount", () => 0);
  const isLoading = useState<boolean>("client:notifications:loading", () => false);
  const isLoadingMore = useState<boolean>("client:notifications:loadingMore", () => false);
  const hasLoaded = useState<boolean>("client:notifications:hasLoaded", () => false);
  const error = useState<AuthErrorInfo | null>("client:notifications:error", () => null);
  const requestFetch = useRequestFetch();

  const hasMore = computed(() => Boolean(meta.value && meta.value.current_page < meta.value.last_page));

  // Ne vide jamais `items.value` avant la réponse : un appel de rafraîchissement
  // (silencieux, en arrière-plan) laisse les données déjà chargées visibles
  // pendant le fetch — même stratégie stale-while-revalidate que
  // useClientDashboard.ts. Remplace toujours la page 1 en entier (jamais un
  // simple préfixe) : un loadMore() précédent peut avoir étendu `items` bien
  // au-delà de la taille d'une page.
  async function fetchNotifications(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await requestFetch<ClientNotificationsResponse>("/api/client/notifications");
      items.value = response.data;
      meta.value = response.meta;
      unreadCount.value = response.unread_count;
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Pagination Laravel standard (voir server/api/client/notifications.get.ts) :
  // concatène en dédupliquant par `id`, jamais de remplacement — deux appels
  // concurrents (double clic sur "Afficher plus") ne dupliquent donc jamais
  // une notification déjà connue.
  async function loadMore(): Promise<boolean> {
    if (!hasMore.value || isLoadingMore.value) return true;

    const nextPage = (meta.value?.current_page ?? 1) + 1;
    isLoadingMore.value = true;
    error.value = null;
    try {
      const response = await requestFetch<ClientNotificationsResponse>("/api/client/notifications", { query: { page: nextPage } });
      const knownIds = new Set(items.value.map((notification) => notification.id));
      const newItems = response.data.filter((notification: ClientNotification) => !knownIds.has(notification.id));
      items.value = [...items.value, ...newItems];
      meta.value = response.meta;
      unreadCount.value = response.unread_count;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      return false;
    } finally {
      isLoadingMore.value = false;
    }
  }

  // Mise à jour optimiste (badge/état lu immédiats, demande du 27/08/2026,
  // section 4) avec rollback explicite en cas d'échec réseau (demande du
  // 28/08/2026, section 8 : la mise à jour optimiste ne doit pas mentir si le
  // backend ne confirme jamais) — sur succès, adopte l'état canonique renvoyé
  // par NotificationsController::markRead() (idempotent, 404 si la
  // notification n'appartient pas à l'utilisateur) plutôt que de faire
  // confiance à la valeur devinée localement.
  async function markRead(id: string): Promise<boolean> {
    const target = items.value.find((notification) => notification.id === id);
    if (!target || target.lu) return true;

    const previousUnreadCount = unreadCount.value;
    target.lu = true;
    target.read_at = new Date().toISOString();
    unreadCount.value = Math.max(0, unreadCount.value - 1);

    try {
      const response = await requestFetch<ApiNotificationMarkReadResponse>(`/api/client/notifications/${id}/read`, { method: "POST" });
      Object.assign(target, response.data);
      unreadCount.value = response.unread_count;
      return true;
    } catch {
      target.lu = false;
      target.read_at = null;
      unreadCount.value = previousUnreadCount;
      return false;
    }
  }

  async function markAllRead(): Promise<boolean> {
    const previous = items.value.map((notification) => ({ id: notification.id, lu: notification.lu, read_at: notification.read_at }));
    const previousUnreadCount = unreadCount.value;
    const now = new Date().toISOString();
    items.value.forEach((notification) => {
      if (!notification.lu) {
        notification.lu = true;
        notification.read_at = now;
      }
    });
    unreadCount.value = 0;

    try {
      const response = await requestFetch<ApiNotificationsMarkAllReadResponse>("/api/client/notifications/mark-all-read", { method: "POST" });
      unreadCount.value = response.unread_count;
      return true;
    } catch {
      const previousById = new Map(previous.map((notification) => [notification.id, notification]));
      items.value.forEach((notification) => {
        const original = previousById.get(notification.id);
        if (original) {
          notification.lu = original.lu;
          notification.read_at = original.read_at;
        }
      });
      unreadCount.value = previousUnreadCount;
      return false;
    }
  }

  // Purge à la déconnexion (voir composables/useAuth.ts::clear()) — aucune
  // notification du compte précédent ne doit pouvoir apparaître, même
  // brièvement, après la connexion d'un autre compte dans le même onglet
  // (demande du 28/08/2026, section 23).
  function reset() {
    items.value = [];
    meta.value = null;
    unreadCount.value = 0;
    hasLoaded.value = false;
    error.value = null;
  }

  return {
    items,
    meta,
    unreadCount,
    hasMore,
    isLoading,
    isLoadingMore,
    hasLoaded,
    error,
    fetchNotifications,
    loadMore,
    markRead,
    markAllRead,
    reset,
  };
}
