import type { ApiNotification, ApiNotificationsResponse } from "~/types/api";

// Nouveau contrat réel GET /v1/mobile/notifications côté elm-monolithe
// (chantier backend "contrat API notifications" finalisé le 27/08/2026, migré
// côté Nuxt le 28/08/2026 — remplace l'ancien contrat {data (payload brut
// Laravel), lu, sans vraie pagination}). `type` reste une chaîne libre côté
// TypeScript (Scramble ne peut pas exprimer la liste blanche fermée
// NotificationResource::TYPE_MAP comme un enum OpenAPI, voir le rapport de ce
// chantier) mais correspond en pratique à l'une de : delivery.assigned,
// commission.missing, commission.generated, commission.paid,
// expense.validated, transfer.created, transfer.received — jamais un nom de
// classe Notification Laravel, jamais deviné ici au-delà de ces valeurs
// connues (voir notificationVisual ci-dessous, repli neutre sinon).
export type ClientNotification = ApiNotification;
export type ClientNotificationsResponse = ApiNotificationsResponse;
export type ClientNotificationResource = NonNullable<ClientNotification["resource"]>;

// Apparence par type — mapping purement présentationnel (le backend ne
// renvoie qu'un événement factuel, jamais une couleur/icône, demande du
// 27/08/2026 section 12-13). Un type absent de cette liste retombe sur
// defaultNotificationVisual, jamais une icône inventée pour un type inconnu.
const notificationVisuals: Record<string, { icon: string; background: string; iconColor: string }> = {
  "delivery.assigned": { icon: "pi pi-truck", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500" },
  "commission.generated": { icon: "pi pi-wallet", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500" },
  "commission.paid": { icon: "pi pi-wallet", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500" },
  "commission.missing": { icon: "pi pi-exclamation-triangle", background: "bg-orange-100 dark:bg-orange-400/10", iconColor: "text-orange-500" },
  "expense.validated": { icon: "pi pi-receipt", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500" },
  "transfer.created": { icon: "pi pi-arrow-right-arrow-left", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500" },
  "transfer.received": { icon: "pi pi-arrow-right-arrow-left", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500" },
};
const defaultNotificationVisual = { icon: "pi pi-bell", background: "bg-surface-100 dark:bg-surface-800", iconColor: "text-muted-color" };
export const notificationVisual = (type: string) => notificationVisuals[type] || defaultNotificationVisual;

// Badge du nombre de non-lues (cloche du header) : "9+" au-delà de 9, jamais
// "0" (la cloche seule masque déjà l'absence de non-lues, voir
// components/client/layout/ClientTopbar.vue / ClientMobileTopbar.vue).
export const notificationBadgeLabel = (unreadCount: number): string | null => {
  if (unreadCount <= 0) return null;
  return unreadCount > 9 ? "9+" : String(unreadCount);
};

// Redirection contextuelle — UNIQUEMENT à partir de `resource` (fourni par
// Laravel seulement quand une vraie ressource identifiable existe, jamais
// fabriqué ici). `resource.type` est le type de RESSOURCE ("commande_vente"),
// distinct de `notification.type` qui est le type d'ÉVÉNEMENT
// ("delivery.assigned") — ne pas confondre les deux. Seule correspondance
// connue aujourd'hui côté backend : une commande de vente s'ouvre via
// Livraisons (pages/espace-client/activite.vue, lecture de `?commande=`).
// Aucun autre type de ressource ne porte encore de route équivalente : pas de
// lien inventé, la notification reste alors simplement lisible/marquable lue.
export function notificationResourceToRoute(resource: ClientNotification["resource"]): { path: string; query: Record<string, string> } | null {
  if (!resource) return null;

  if (resource.type === "commande_vente") {
    return { path: "/espace-client/activite", query: { commande: resource.id } };
  }

  return null;
}
