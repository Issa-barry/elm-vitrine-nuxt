<script setup lang="ts">
import type { ClientNotification } from "~/config/clientNotifications";
import { notificationActionRoute } from "~/config/clientNotifications";

// Centre de notifications plein écran — cible du bouton cloche mobile
// (ClientMobileTopbar.vue) : "ne pas essayer de faire entrer un gros
// dropdown dans le header... ouvrir une vraie page" (demande du 27/08/2026,
// section 3). Desktop/tablette utilisent le panneau
// ClientNotificationsPanel.vue à la place (cloche toujours visible dans
// ClientTopbar.vue) ; cette page reste néanmoins joignable et fonctionnelle
// à toute largeur (lien direct, valeur de repli), même deux sections
// mobile/desktop que activite.vue/vehicules.vue.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Notifications — Eau La Maman" });

const { notifications, isLoading, hasLoaded, fetchNotifications, markRead, markAllRead } = useClientNotifications();
const router = useRouter();

// Rafraîchissement silencieux à l'ouverture : les données déjà chargées
// (layouts/client.vue) restent visibles pendant le fetch, aucune coupure
// (demande du 27/08/2026, section 7 — même stratégie que
// useClientDashboard.ts).
onMounted(() => { fetchNotifications(); });

const items = computed(() => notifications.value?.data ?? []);
const unreadCount = computed(() => notifications.value?.unread_count ?? 0);

async function onSelect(notification: ClientNotification) {
  const route = notificationActionRoute(notification);
  await markRead(notification.id);
  if (route) {
    await router.push(route);
  }
}
</script>

<template>
  <div>
    <section class="client-mobile-notifications" aria-labelledby="mobile-notifications-title">
      <ClientMobilePageTopbar
        title="Notifications"
        title-id="mobile-notifications-title"
        back-to="back"
      >
        <template #actions>
          <button
            type="button"
            class="client-mobile-page-topbar__filter"
            :disabled="unreadCount === 0"
            @click="markAllRead"
          >
            Tout lu
          </button>
        </template>
      </ClientMobilePageTopbar>

      <ClientNotificationsList
        :notifications="items"
        :loading="isLoading && !hasLoaded"
        @select="onSelect"
      />
    </section>

    <section class="client-desktop-notifications" aria-labelledby="desktop-notifications-title">
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 id="desktop-notifications-title" class="text-3xl font-semibold mb-2">Notifications</h1>
          <p class="text-muted-color m-0">Retrouvez vos notifications récentes.</p>
        </div>
        <Button label="Tout marquer comme lu" severity="secondary" outlined :disabled="unreadCount === 0" @click="markAllRead" />
      </div>

      <div class="card">
        <ClientNotificationsList
          :notifications="items"
          :loading="isLoading && !hasLoaded"
          @select="onSelect"
        />
      </div>
    </section>
  </div>
</template>
