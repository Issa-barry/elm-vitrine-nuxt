<script setup lang="ts">
const { state, isDarkTheme, toggleDarkMode, toggleConfigMenu } = useClientLayout();
</script>

<template>
  <header class="client-mobile-topbar">
    <NuxtLink to="/espace-client/profil" class="client-mobile-avatar" aria-label="Ouvrir mon profil">
      <i class="pi pi-user" />
    </NuxtLink>

    <ClientLayoutClientBrand />

    <div class="client-mobile-topbar-actions">
      <button type="button" class="client-mobile-icon-button client-mobile-notification" aria-label="Notifications">
        <i class="pi pi-bell" />
        <span class="client-mobile-notification-dot" />
      </button>

      <button type="button" class="client-mobile-icon-button" :aria-label="isDarkTheme ? 'Activer le mode clair' : 'Activer le mode sombre'" @click="toggleDarkMode">
        <i :class="['pi', isDarkTheme ? 'pi-sun' : 'pi-moon']" />
      </button>

      <div class="client-mobile-config-wrapper">
        <button type="button" class="client-mobile-icon-button client-mobile-theme-button" aria-label="Personnaliser le thème" @click="toggleConfigMenu">
          <i class="pi pi-palette" />
        </button>
        <ClientLayoutClientConfigurator v-if="state.configMenuVisible" />
      </div>
    </div>
  </header>
</template>
