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
    <div class="client-desktop-chrome">
      <ClientLayoutClientTopbar />
      <ClientLayoutClientSidebar />
    </div>
    <ClientMobileTopbar />
    <div class="layout-main-container">
      <main class="layout-main">
        <slot />
      </main>
      <ClientLayoutClientFooter />
    </div>
    <ClientMobileBottomNav />
    <button class="layout-mask" type="button" aria-label="Fermer le menu" @click="closeOverlays" />
  </div>
</template>

<style lang="scss">
@use "~/assets/scss/sakai/index.scss";
</style>
