<script setup lang="ts">
type ClientMenuEntry = {
  label: string;
  icon?: string;
  to?: string;
  url?: string;
  target?: string;
  items?: ClientMenuEntry[];
};

const props = withDefaults(defineProps<{ item: ClientMenuEntry; root?: boolean }>(), {
  root: true,
});

const route = useRoute();
const opened = ref(true);

const isActive = computed(() => {
  if (!props.item.to) return props.item.items?.some((child) => child.to && route.path.startsWith(child.to)) ?? false;
  if (props.item.to === "/espace-client") return route.path === props.item.to;
  return route.path.startsWith(props.item.to);
});

const toggleSubmenu = () => {
  if (props.item.items) opened.value = !opened.value;
};
</script>

<template>
  <li :class="{ 'layout-root-menuitem': root, 'active-menuitem': isActive }">
    <div v-if="root" class="layout-menuitem-root-text">{{ item.label }}</div>

    <button v-if="!root && item.items" type="button" class="layout-menuitem-link" @click="toggleSubmenu">
      <i :class="item.icon" class="layout-menuitem-icon" />
      <span class="layout-menuitem-text">{{ item.label }}</span>
      <i class="pi pi-fw pi-angle-down layout-submenu-toggler" />
    </button>

    <NuxtLink
      v-else-if="!root && item.to"
      :to="item.to"
      :class="{ 'active-route': isActive }"
      class="layout-menuitem-link"
    >
      <i :class="item.icon" class="layout-menuitem-icon" />
      <span class="layout-menuitem-text">{{ item.label }}</span>
    </NuxtLink>

    <a v-else-if="!root && item.url" :href="item.url" :target="item.target" class="layout-menuitem-link">
      <i :class="item.icon" class="layout-menuitem-icon" />
      <span class="layout-menuitem-text">{{ item.label }}</span>
    </a>

    <Transition v-if="item.items" name="layout-submenu">
      <ul v-show="root || opened" class="layout-submenu">
        <ClientLayoutClientMenuItem
          v-for="child in item.items"
          :key="child.label"
          :item="child"
          :root="false"
        />
      </ul>
    </Transition>
  </li>
</template>
