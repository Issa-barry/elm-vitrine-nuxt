<script setup lang="ts">
const { state, isDarkTheme, toggleDarkMode, toggleConfigMenu, toggleTopbarMenu, closeOverlays } = useClientLayout();

const configPanelId = "client-mobile-config-panel";
const configWrapper = ref<HTMLElement | null>(null);
const themeButton = ref<HTMLButtonElement | null>(null);

const profilePanelId = "client-mobile-profile-panel";
const avatarButton = ref<HTMLButtonElement | null>(null);

const handlePointerDown = (event: PointerEvent) => {
  const wrapper = configWrapper.value;
  const target = event.target;
  if (!wrapper || !(target instanceof Node) || wrapper.contains(target)) return;
  closeOverlays();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  closeOverlays();
  themeButton.value?.focus();
};

watch(
  () => state.value.configMenuVisible,
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
  <header class="client-mobile-topbar">
    <div class="client-mobile-topbar-side client-mobile-topbar-start">
      <button
        ref="avatarButton"
        type="button"
        class="client-mobile-avatar"
        aria-label="Ouvrir mon profil et mes paramètres"
        :aria-expanded="state.topbarMenuVisible"
        :aria-controls="profilePanelId"
        @click="toggleTopbarMenu"
      >
        <i class="pi pi-user" />
      </button>

      <Drawer
        :id="profilePanelId"
        v-model:visible="state.topbarMenuVisible"
        position="right"
        modal
        dismissable
        close-on-escape
        block-scroll
        :show-close-icon="false"
        aria-label="Profil"
        class="client-mobile-profile-drawer"
        @hide="avatarButton?.focus()"
      >
        <template #header>
          <div class="client-mobile-profile-header">
            <button type="button" class="client-mobile-profile-close" aria-label="Fermer le profil" @click="closeOverlays">
              <i class="pi pi-times" />
            </button>
            <h2 class="client-mobile-profile-title">Profil</h2>
            <span class="client-mobile-profile-spacer" aria-hidden="true" />
          </div>
        </template>

        <ClientMobileProfilePanel />
      </Drawer>
    </div>

    <div class="client-mobile-topbar-side client-mobile-topbar-end">
      <NuxtLink to="/espace-client/activite" class="client-mobile-icon-button" aria-label="Voir l’activité et les notifications">
        <i class="pi pi-bell" />
      </NuxtLink>

      <button
        type="button"
        class="client-mobile-icon-button"
        :aria-label="isDarkTheme ? 'Activer le mode clair' : 'Activer le mode sombre'"
        :aria-pressed="isDarkTheme"
        @click="toggleDarkMode"
      >
        <i :class="['pi', isDarkTheme ? 'pi-sun' : 'pi-moon']" />
      </button>

      <div ref="configWrapper" class="client-mobile-config-wrapper">
        <button
          ref="themeButton"
          type="button"
          class="client-mobile-icon-button client-mobile-theme-button"
          aria-label="Personnaliser le thème"
          :aria-expanded="state.configMenuVisible"
          :aria-controls="configPanelId"
          @click="toggleConfigMenu"
        >
          <i class="pi pi-palette" />
        </button>
        <ClientLayoutClientConfigurator v-if="state.configMenuVisible" :id="configPanelId" />
      </div>
    </div>
  </header>
</template>
