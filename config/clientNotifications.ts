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

// Apparence par type — MÊME mapping que la carte "Notifications" du dashboard
// (pages/espace-client/index.vue avant extraction, chantier "centre de
// notifications" du 27/08/2026) : centralisé ici pour que le dashboard, le
// panneau desktop et la page mobile restent visuellement cohérents. `type`
// étant une chaîne libre côté backend (voir plus haut), un type absent de
// cette liste retombe sur `defaultNotificationVisual`, jamais une icône
// inventée.
const notificationVisuals: Record<string, { icon: string; background: string; iconColor: string }> = {
  commande_validee: { icon: "pi pi-send", background: "bg-orange-100 dark:bg-orange-400/10", iconColor: "text-orange-500" },
  livraison_terminee: { icon: "pi pi-check", background: "bg-blue-100 dark:bg-blue-400/10", iconColor: "text-blue-500" },
  versement: { icon: "pi pi-wallet", background: "bg-green-100 dark:bg-green-400/10", iconColor: "text-green-500" },
};
const defaultNotificationVisual = { icon: "pi pi-bell", background: "bg-surface-100 dark:bg-surface-800", iconColor: "text-muted-color" };
export const notificationVisual = (type: string | null) => (type && notificationVisuals[type]) || defaultNotificationVisual;

// Badge du nombre de non-lues (cloche du header) : "9+" au-delà de 9, jamais
// "0" (la cloche seule masque déjà l'absence de non-lues, voir
// components/client/layout/ClientTopbar.vue / ClientMobileTopbar.vue).
export const notificationBadgeLabel = (unreadCount: number): string | null => {
  if (unreadCount <= 0) return null;
  return unreadCount > 9 ? "9+" : String(unreadCount);
};

// Redirection contextuelle (chantier "centre de notifications" du
// 27/08/2026, section 5) — UNIQUEMENT pour les types dont le backend fournit
// réellement de quoi retrouver la ressource concernée. Vérifié directement
// contre elm-monolithe le 27/08/2026 :
//   - `commande_validee` (App\Notifications\CommandeValideeNotification,
//     envoyée par NotifierLivreursCommandeVenteJob) : SEUL type réellement
//     envoyé à un compte espace client (proprietaire du véhicule + livreurs
//     de son équipe). `data.commande_id` correspond exactement à l'`id` d'un
//     item `type: "vente"` de GET /v1/mobile/activite (ActiviteController::
//     ventes(), `id: $c->id` = CommandeVente::id) : on peut donc renvoyer
//     vers Livraisons et y ouvrir directement le bon détail (voir
//     pages/espace-client/activite.vue, lecture de `?commande=`).
//   - `commission_payee` (App\Notifications\CommissionPayeeNotification)
//     existe côté backend mais N'EST DÉCLENCHÉE NULLE PART dans le code
//     actuel (aucun `->notify(new CommissionPayeeNotification(...))` trouvé)
//     — jamais reçue en pratique aujourd'hui, donc pas de redirection câblée.
//   - `commission_manquante` (App\Notifications\CommissionManquanteNotification)
//     est réservée aux rôles staff (`super_admin`/`admin_entreprise`) côté
//     CommissionEnveloppeGenerator::alerterCommissionManquante() — jamais
//     envoyée à un client/proprietaire/livreur, donc hors périmètre espace
//     client par construction.
// Aucun type actuel ne porte de `depense_id` ni de `vehicule_id` : une
// redirection "Dépenses"/"Véhicule concerné" ne peut donc PAS être construite
// aujourd'hui sans inventer un champ absent du contrat réel — manque
// backend à signaler si ce besoin devient prioritaire, plutôt que deviné ici.
export function notificationActionRoute(notification: ClientNotification): { path: string; query: Record<string, string> } | null {
  if (notification.type === "commande_validee") {
    const commandeId = notification.data.commande_id;
    if (typeof commandeId === "string" && commandeId) {
      return { path: "/espace-client/activite", query: { commande: commandeId } };
    }
  }

  return null;
}
