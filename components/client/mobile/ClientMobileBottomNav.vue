<script setup lang="ts">
import { bottomNavItems } from "~/config/clientNavigation";

// Construit depuis bottomNavItems() + useClientCapabilities() — voir le
// commentaire équivalent dans ClientMenu.vue (desktop), même source unique de
// navigation (chantier "capacités" du 27/08/2026). La barre suit l'espace ouvert.
const route = useRoute();
const capabilities = useClientCapabilities();

const items = computed(() => bottomNavItems(capabilities.value, route.path)
  .map((item) => ({ label: item.mobileLabel ?? item.label, icon: `pi ${item.icon}`, to: item.to, exact: item.exact })));

const isActive = (item: (typeof items.value)[number]) => item.exact
  ? route.path === item.to
  : route.path.startsWith(item.to);
</script>

<template>
  <nav
    class="client-mobile-bottom-nav"
    aria-label="Navigation principale"
    :style="{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }"
  >
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
