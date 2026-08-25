<script setup lang="ts">
const {
  state,
  isDarkTheme,
  toggleMenu,
  toggleDarkMode,
  toggleConfigMenu,
  toggleTopbarMenu,
} = useClientLayout();
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

      <button class="layout-topbar-menu-button layout-topbar-action" type="button" aria-label="Actions rapides" @click="toggleTopbarMenu">
        <i class="pi pi-ellipsis-v" />
      </button>

      <div class="layout-topbar-menu" :class="{ 'topbar-menu-visible': state.topbarMenuVisible }">
        <div class="layout-topbar-menu-content">
          <NuxtLink to="/espace-client/activite" class="layout-topbar-action">
            <i class="pi pi-calendar" />
            <span>Activité</span>
          </NuxtLink>
          <button type="button" class="layout-topbar-action">
            <i class="pi pi-inbox" />
            <span>Notifications</span>
          </button>
          <NuxtLink to="/espace-client/profil" class="layout-topbar-action">
            <i class="pi pi-user" />
            <span>Profil</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>
