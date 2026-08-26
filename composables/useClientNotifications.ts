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
  const error = useState<AuthErrorInfo | null>("client:notifications:error", () => null);
  const requestFetch = useRequestFetch();

  async function fetchNotifications(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      notifications.value = await requestFetch<ClientNotificationsResponse>("/api/client/notifications");
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      notifications.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function markAllRead(): Promise<boolean> {
    try {
      await requestFetch("/api/client/notifications/mark-all-read", { method: "POST" });
      // Re-fetch plutôt qu'une mise à jour optimiste locale : source de
      // vérité unique, même principe que useClientProfile.ts (non optimiste).
      await fetchNotifications();
      return true;
    } catch {
      return false;
    }
  }

  return { notifications, isLoading, error, fetchNotifications, markAllRead };
}
