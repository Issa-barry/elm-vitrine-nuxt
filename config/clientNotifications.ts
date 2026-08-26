// Type du contrat réel GET /v1/mobile/notifications côté elm-monolithe (voir
// docs/api-espace-client-contract.md §7, vérifié directement contre
// App\Http\Controllers\Api\Mobile\NotificationsController le 26/08/2026).
// Système générique Laravel (Notifiable/DatabaseNotifications) — `type` est
// une chaîne libre définie par chaque notification émise côté backend,
// jamais une liste fermée connue à l'avance côté frontend.
export interface ClientNotification {
  id: string;
  type: string | null;
  titre: string | null;
  message: string | null;
  data: Record<string, unknown>;
  lu: boolean;
  created_at: string;
}

export interface ClientNotificationsResponse {
  data: ClientNotification[];
  unread_count: number;
}
