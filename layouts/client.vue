<script setup lang="ts">
const route = useRoute();
const { config, state, closeOverlays } = useClientLayout();

onMounted(() => {
  document.documentElement.classList.toggle("app-dark", config.value.darkTheme);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("app-dark");
});

watch(
  () => route.path,
  () => closeOverlays(),
);

const containerClass = computed(() => ({
  "layout-overlay": config.value.menuMode === "overlay",
  "layout-static": config.value.menuMode === "static",
  "layout-overlay-active": state.value.overlayMenuActive,
  "layout-static-inactive": state.value.staticMenuInactive,
  "layout-mobile-active": state.value.mobileMenuActive,
}));
</script>

<template>
  <div class="elm-client-shell layout-wrapper" :class="containerClass">
    <ClientLayoutClientTopbar />
    <ClientLayoutClientSidebar />
    <div class="layout-main-container">
      <main class="layout-main">
        <slot />
      </main>
      <ClientLayoutClientFooter />
    </div>
    <button class="layout-mask" type="button" aria-label="Fermer le menu" @click="closeOverlays" />
  </div>
</template>

<style lang="scss">
@use "~/assets/scss/sakai/index.scss";
</style>
