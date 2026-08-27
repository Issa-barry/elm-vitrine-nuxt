// Type du contrat réel GET /v1/mobile/notifications côté elm-monolithe (voir
// docs/api-espace-client-contract.md §7, vérifié directement contre
// App\Http\Controllers\Api\Mobile\NotificationsController le 26/08/2026).
// Système générique Laravel (Notifiable/DatabaseNotifications) — `type` est
// une chaîne libre définie par chaque notification émise côté backend,
// jamais une liste fermée connue à l'avance côté frontend.
//
// IMPERFECTION OpenAPI CONSTATÉE (chantier "types OpenAPI" du 27/08/2026,
// voir types/generated/elm-api.ts) : `data[].type`/`titre`/`message` sont
// générés en schema vide (`{}`, un type effectivement `unknown`) — attendu
// ici vu leur origine (`$n->data['type'] ?? null`, un accès dynamique dans
// un payload de notification à structure libre selon le type émis, que
// Scramble ne peut pas inférer), mais reste trop imprécis pour remplacer ces
// types écrits à la main (`string | null`, cohérent avec l'usage réel actuel
// de ces 3 champs). `data.data` (le payload brut) est aussi générique côté
// OpenAPI (`array`) ; gardé ici en `Record<string, unknown>`, plus proche de
// la vraie forme (objet JSON, pas un tableau).
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
