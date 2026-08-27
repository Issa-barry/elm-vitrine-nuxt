<script setup lang="ts">
const route = useRoute();
const { config, state, closeOverlays } = useClientLayout();
const showMobileTopbar = computed(() => route.path.replace(/\/+$/, "") === "/espace-client");

// Chargées une seule fois par montage du shell (pas par page) : la cloche du
// header (ClientTopbar.vue / ClientMobileTopbar.vue) doit afficher un badge
// à jour dès l'entrée dans l'espace client, sur N'IMPORTE QUELLE page, pas
// seulement le tableau de bord — chantier "centre de notifications" du
// 27/08/2026. `useClientNotifications()` reste un état partagé (useState) :
// pages/espace-client/index.vue ne refait plus son propre fetch (retiré de
// son onMounted), il lit la même donnée déjà chargée ici.
const { fetchNotifications } = useClientNotifications();

onMounted(() => {
  document.documentElement.classList.toggle("app-dark", config.value.darkTheme);
  fetchNotifications();
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
  "has-client-mobile-topbar": showMobileTopbar.value,
}));
</script>

<template>
  <div class="elm-client-shell layout-wrapper" :class="containerClass">
    <div class="client-desktop-chrome">
      <ClientLayoutClientTopbar />
      <ClientLayoutClientSidebar />
    </div>
    <ClientMobileTopbar v-if="showMobileTopbar" />
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
