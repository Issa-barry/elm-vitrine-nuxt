<script setup lang="ts">
import type { ClientNotification } from "~/config/clientNotifications";
import { notificationResourceToRoute } from "~/config/clientNotifications";

// Centre de notifications plein écran — cible du bouton cloche mobile
// (ClientMobileTopbar.vue) : "ne pas essayer de faire entrer un gros
// dropdown dans le header... ouvrir une vraie page" (demande du 27/08/2026,
// section 3 ; migré vers le contrat paginé le 28/08/2026). Desktop/tablette
// utilisent le panneau ClientNotificationsPanel.vue à la place (cloche
// toujours visible dans ClientTopbar.vue) ; cette page reste néanmoins
// joignable et fonctionnelle à toute largeur (lien direct, valeur de repli),
// même deux sections mobile/desktop que activite.vue/vehicules.vue.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Notifications — Eau La Maman" });

const { items, unreadCount, hasMore, isLoading, isLoadingMore, hasLoaded, error, fetchNotifications, loadMore, markRead, markAllRead } = useClientNotifications();
const router = useRouter();

// Rafraîchissement silencieux à l'ouverture : les données déjà chargées
// (layouts/client.vue) restent visibles pendant le fetch, aucune coupure
// (demande du 27/08/2026, section 7 — même stratégie que
// useClientDashboard.ts).
onMounted(() => { fetchNotifications(); });

async function onSelect(notification: ClientNotification) {
  const route = notificationResourceToRoute(notification.resource);
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

      <div v-if="error && !hasLoaded" class="flex flex-col items-center text-center py-10 px-4 text-muted-color">
        <p class="text-sm mb-3">Impossible de charger les notifications.</p>
        <Button label="Réessayer" size="small" severity="secondary" outlined @click="fetchNotifications" />
      </div>
      <template v-else>
        <ClientNotificationsList
          :notifications="items"
          :loading="isLoading && !hasLoaded"
          @select="onSelect"
        />
        <div v-if="hasMore" class="flex justify-center py-3">
          <Button label="Afficher plus" text :loading="isLoadingMore" @click="loadMore" />
        </div>
      </template>
    </section>

    <section class="client-desktop-notifications" aria-labelledby="desktop-notifications-title">
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 id="desktop-notifications-title" class="text-3xl font-semibold mb-2">Notifications</h1>
          <p class="text-muted-color m-0">Retrouvez vos notifications récentes.</p>
        </div>
        <Button label="Tout marquer comme lu" severity="secondary" outlined :disabled="unreadCount === 0" @click="markAllRead" />
      </div>

      <div v-if="error && !hasLoaded" class="card text-center text-muted-color">
        <p class="text-sm mb-3">Impossible de charger les notifications.</p>
        <Button label="Réessayer" size="small" severity="secondary" outlined @click="fetchNotifications" />
      </div>
      <div v-else class="card">
        <ClientNotificationsList
          :notifications="items"
          :loading="isLoading && !hasLoaded"
          @select="onSelect"
        />
        <div v-if="hasMore" class="flex justify-center pt-3 border-t border-surface">
          <Button label="Afficher plus" text :loading="isLoadingMore" @click="loadMore" />
        </div>
      </div>
    </section>
  </div>
</template>
