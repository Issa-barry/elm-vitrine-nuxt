<script setup lang="ts">
const route = useRoute();

const items = [
  { label: "Accueil", icon: "pi pi-home", to: "/espace-client", exact: true },
  { label: "Commissions", icon: "pi pi-percentage", to: "/espace-client/commissions" },
  { label: "Livraisons", icon: "pi pi-box", to: "/espace-client/activite" },
  { label: "Véhicules", icon: "pi pi-car", to: "/espace-client/vehicules" },
];

const isActive = (item: (typeof items)[number]) => item.exact
  ? route.path === item.to
  : route.path.startsWith(item.to);
</script>

<template>
  <nav class="client-mobile-bottom-nav" aria-label="Navigation principale">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="client-mobile-nav-item"
      :class="{ 'is-active': isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
    >
      <i :class="item.icon" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
