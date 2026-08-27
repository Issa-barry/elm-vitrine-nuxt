import type { ClientNotificationsResponse } from "~/config/clientNotifications";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Notifications reçues (GET /v1/mobile/notifications) — distinct des
// PRÉFÉRENCES de notification (useClientProfile.ts::updateNotificationPreference,
// PATCH /v1/mobile/profile/notification-preferences) : voir
// docs/api-espace-client-contract.md §7, ne jamais mélanger les deux (demande
// du 26/08/2026, section 18).
export function useClientNotifications() {
  const notifications = useState<ClientNotificationsResponse | null>("client:notifications", () => null);
  const isLoading = useState<boolean>("client:notifications:loading", () => false);
  const hasLoaded = useState<boolean>("client:notifications:hasLoaded", () => false);
  const error = useState<AuthErrorInfo | null>("client:notifications:error", () => null);
  const requestFetch = useRequestFetch();

  const unreadCount = computed(() => notifications.value?.unread_count ?? 0);

  // Ne vide jamais `notifications.value` avant la réponse : un appel de
  // rafraîchissement (silencieux, en arrière-plan) laisse les données déjà
  // chargées visibles pendant le fetch — même stratégie stale-while-revalidate
  // que useClientDashboard.ts (chantier "performance/skeleton" du 27/08/2026).
  async function fetchNotifications(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      notifications.value = await requestFetch<ClientNotificationsResponse>("/api/client/notifications");
      hasLoaded.value = true;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Mise à jour optimiste (badge/état lu immédiats, demande du 27/08/2026,
  // section 4 : "le badge global doit diminuer sans attendre un rechargement
  // complet") — pas de rollback explicite en cas d'échec réseau : un
  // prochain fetchNotifications() (ouverture suivante du panneau/de la page)
  // resynchronise de toute façon avec la vraie source de vérité backend.
  async function markRead(id: string): Promise<boolean> {
    const current = notifications.value;
    const target = current?.data.find((n) => n.id === id);
    if (!current || !target || target.lu) return true;

    target.lu = true;
    current.unread_count = Math.max(0, current.unread_count - 1);

    try {
      await requestFetch(`/api/client/notifications/${id}/read`, { method: "POST" });
      return true;
    } catch {
      return false;
    }
  }

  async function markAllRead(): Promise<boolean> {
    const current = notifications.value;
    if (current) {
      current.data.forEach((n) => { n.lu = true; });
      current.unread_count = 0;
    }

    try {
      await requestFetch("/api/client/notifications/mark-all-read", { method: "POST" });
      return true;
    } catch {
      return false;
    }
  }

  return { notifications, unreadCount, isLoading, hasLoaded, error, fetchNotifications, markRead, markAllRead };
}
