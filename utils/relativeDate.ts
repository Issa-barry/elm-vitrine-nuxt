// Formatage de date relative — auto-importé par Nuxt comme le reste de
// utils/*.ts (voir utils/money.ts pour le même principe). Introduit pour le
// centre de notifications (migration du 28/08/2026) : au-delà d'une semaine,
// une date relative devient moins lisible qu'une date courte, d'où le repli
// sur le même format absolu "12 août, 14:32" déjà utilisé ailleurs dans
// l'espace client (voir components/client/notifications/ClientNotificationsList.vue
// avant cette migration, pages/espace-client/index.vue).
const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * "À l'instant" / "Il y a 5 min" / "Il y a 2 h" / "Hier" / "Il y a 6 j", puis
 * repli sur une date courte au-delà d'une semaine. `now` injectable pour les
 * tests (jamais lu depuis `Date.now()` en dur dans les assertions).
 */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return ABSOLUTE_FORMATTER.format(date);
}
