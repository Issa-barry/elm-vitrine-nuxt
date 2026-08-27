<script setup lang="ts">
import { notificationBadgeLabel } from "~/config/clientNotifications";

const {
  state,
  isDarkTheme,
  toggleMenu,
  toggleDarkMode,
  toggleConfigMenu,
  toggleTopbarMenu,
  toggleNotificationsMenu,
} = useClientLayout();

const { unreadCount } = useClientNotifications();
const badgeLabel = computed(() => notificationBadgeLabel(unreadCount.value));
const bellLabel = computed(() => (unreadCount.value > 0
  ? `Notifications, ${unreadCount.value} non lue${unreadCount.value > 1 ? "s" : ""}`
  : "Notifications, aucune non lue"));

// Ouvre/ferme au clic hors du panneau et à Échap — même logique que le
// panneau de thème mobile (ClientMobileTopbar.vue), appliquée ici à la
// cloche desktop/tablette (chantier "centre de notifications" du
// 27/08/2026) : indépendante de la config du thème et du sous-menu
// "Actions rapides" (toggleNotificationsMenu ne touche à aucun des deux).
const notificationsWrapper = ref<HTMLElement | null>(null);
const bellButton = ref<HTMLButtonElement | null>(null);

const handlePointerDown = (event: PointerEvent) => {
  const wrapper = notificationsWrapper.value;
  const target = event.target;
  if (!wrapper || !(target instanceof Node) || wrapper.contains(target)) return;
  state.value.notificationsMenuVisible = false;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  state.value.notificationsMenuVisible = false;
  bellButton.value?.focus();
};

watch(
  () => state.value.notificationsMenuVisible,
  (visible) => {
    if (!import.meta.client) return;

    if (visible) {
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeydown);
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <header class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button class="layout-menu-button layout-topbar-action" type="button" aria-label="Ouvrir le menu" @click="toggleMenu">
        <i class="pi pi-bars" />
      </button>
      <ClientLayoutClientBrand />
    </div>

    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button type="button" class="layout-topbar-action" aria-label="Changer le thème" @click="toggleDarkMode">
          <i :class="['pi', isDarkTheme ? 'pi-moon' : 'pi-sun']" />
        </button>
        <div class="relative">
          <button
            type="button"
            class="layout-topbar-action layout-topbar-action-highlight"
            aria-label="Configurer le thème"
            @click="toggleConfigMenu"
          >
            <i class="pi pi-palette" />
          </button>
          <ClientLayoutClientConfigurator v-if="state.configMenuVisible" />
        </div>
      </div>

      <div ref="notificationsWrapper" class="relative">
        <button
          ref="bellButton"
          type="button"
          class="layout-topbar-action relative"
          :aria-label="bellLabel"
          :aria-expanded="state.notificationsMenuVisible"
          @click="toggleNotificationsMenu"
        >
          <i class="pi pi-bell" />
          <span
            v-if="badgeLabel"
            class="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 !flex items-center justify-center rounded-full bg-red-500 text-white text-[0.65rem] font-bold leading-none"
            aria-hidden="true"
          >{{ badgeLabel }}</span>
        </button>
        <ClientNotificationsPanel v-if="state.notificationsMenuVisible" />
      </div>

      <button class="layout-topbar-menu-button layout-topbar-action" type="button" aria-label="Actions rapides" @click="toggleTopbarMenu">
        <i class="pi pi-ellipsis-v" />
      </button>

      <div class="layout-topbar-menu" :class="{ 'topbar-menu-visible': state.topbarMenuVisible }">
        <div class="layout-topbar-menu-content">
          <NuxtLink to="/espace-client/activite" class="layout-topbar-action">
            <i class="pi pi-calendar" />
            <span>Activité</span>
          </NuxtLink>
          <NuxtLink to="/espace-client/profil" class="layout-topbar-action">
            <i class="pi pi-user" />
            <span>Profil</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>
