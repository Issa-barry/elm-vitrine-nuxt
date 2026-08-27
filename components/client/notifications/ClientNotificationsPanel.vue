<script setup lang="ts">
import type { ClientNotification } from "~/config/clientNotifications";
import { notificationActionRoute } from "~/config/clientNotifications";

// Panneau desktop/tablette (>= 768px, cloche toujours visible dans
// .layout-topbar-actions — voir components/client/layout/ClientTopbar.vue)
// du "centre de notifications" (demande du 27/08/2026). La version mobile
// équivalente est pages/espace-client/notifications.vue (page plein écran) :
// les deux réutilisent ClientNotificationList.vue, jamais deux logiques de
// rendu différentes. Classes Tailwind directement dans le template, même
// convention que components/client/layout/ClientConfigurator.vue (.config-panel).
const { notifications, isLoading, hasLoaded, fetchNotifications, markRead, markAllRead } = useClientNotifications();
const router = useRouter();

const items = computed(() => notifications.value?.data ?? []);
const unreadCount = computed(() => notifications.value?.unread_count ?? 0);

// v-if (pas v-show) sur ce composant côté ClientTopbar.vue : monté à chaque
// ouverture -> déclenche exactement le rafraîchissement silencieux demandé
// (section 7), sans dupliquer d'appel pendant que le panneau reste fermé.
// Les données déjà chargées (layouts/client.vue) restent affichées pendant
// ce fetch, jamais de coupure (fetchNotifications ne vide jamais l'état).
onMounted(() => { fetchNotifications(); });

async function onSelect(notification: ClientNotification) {
  const route = notificationActionRoute(notification);
  await markRead(notification.id);
  if (route) {
    await router.push(route);
  }
}
</script>

<template>
  <section
    class="absolute top-[3.25rem] right-0 z-[1000] w-80 max-h-[28rem] overflow-y-auto bg-surface-0 dark:bg-surface-900 border border-surface rounded-border origin-top shadow-[0px_3px_5px_rgba(0,0,0,0.02),0px_0px_2px_rgba(0,0,0,0.05),0px_1px_4px_rgba(0,0,0,0.08)]"
    aria-label="Notifications"
  >
    <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface sticky top-0 bg-surface-0 dark:bg-surface-900">
      <span class="font-semibold text-surface-900 dark:text-surface-0">Notifications</span>
      <button
        type="button"
        class="text-sm text-primary disabled:text-muted-color disabled:cursor-not-allowed"
        :disabled="unreadCount === 0"
        @click="markAllRead"
      >
        Tout marquer comme lu
      </button>
    </div>

    <div class="px-4">
      <ClientNotificationsList
        :notifications="items"
        :loading="isLoading && !hasLoaded"
        @select="onSelect"
      />
    </div>
  </section>
</template>
