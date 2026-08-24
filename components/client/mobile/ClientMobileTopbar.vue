<script setup lang="ts">
const { state, toggleConfigMenu } = useClientLayout();
</script>

<template>
  <header class="client-mobile-topbar">
    <div class="client-mobile-topbar-side client-mobile-topbar-start">
      <NuxtLink to="/espace-client/profil" class="client-mobile-avatar" aria-label="Ouvrir mon profil">
        <i class="pi pi-user" />
      </NuxtLink>
    </div>

    <ClientLayoutClientBrand class="client-mobile-topbar-brand" />

    <div class="client-mobile-topbar-side client-mobile-topbar-end">
      <NuxtLink to="/espace-client/activite" class="client-mobile-icon-button" aria-label="Voir l’activité et les notifications">
        <i class="pi pi-bell" />
      </NuxtLink>

      <div class="client-mobile-config-wrapper">
        <button type="button" class="client-mobile-icon-button client-mobile-theme-button" aria-label="Personnaliser l’apparence (thème et mode sombre)" @click="toggleConfigMenu">
          <i class="pi pi-palette" />
        </button>
        <ClientLayoutClientConfigurator v-if="state.configMenuVisible" />
      </div>
    </div>
  </header>
</template>
