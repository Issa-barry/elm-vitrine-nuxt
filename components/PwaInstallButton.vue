<script setup lang="ts">
// `variant="primary"` (défaut) : CTA principal mis en avant, mêmes classes
// `landing-theme-action` que components/landing/Link.vue pour une qualité
// visuelle strictement identique aux autres CTA landing (demande du
// 29/08/2026 — l'install ne doit plus ressembler à une option accessoire).
// `variant="secondary"` conservé pour un futur placement plus discret
// (ex. carte Profil, jamais utilisé aujourd'hui) — jamais un remplacement du
// CTA d'authentification, l'installation reste facultative.
withDefaults(defineProps<{ variant?: "primary" | "secondary" }>(), { variant: "primary" });

const { state: installState, showIosSheet, initialize, promptInstall, closeIosSheet } = usePwaInstall();

onMounted(() => {
  initialize();
});
</script>

<template>
  <template v-if="installState !== 'hidden'">
    <button
      type="button"
      :class="variant === 'primary'
        ? 'landing-theme-action landing-theme-action--primary rounded text-center transition border-2 px-5 py-2.5'
        : 'pwa-install-button'"
      @click="promptInstall"
    >
      <span class="inline-flex items-center justify-center gap-2 w-full">
        <i class="pi pi-download" aria-hidden="true" />Installer l'application
      </span>
    </button>

    <Dialog
      v-model:visible="showIosSheet"
      modal
      :closable="true"
      class="pwa-install-ios-dialog"
      aria-labelledby="pwa-install-ios-title"
    >
      <div class="pwa-install-ios-body">
        <h2 id="pwa-install-ios-title">Installer Eau La Maman</h2>
        <ol class="pwa-install-ios-steps">
          <li>
            <i class="pi pi-share-alt" aria-hidden="true" />
            <span>Appuyez sur le bouton <strong>Partager</strong> de Safari.</span>
          </li>
          <li>
            <i class="pi pi-plus-circle" aria-hidden="true" />
            <span>Choisissez <strong>« Sur l'écran d'accueil »</strong>.</span>
          </li>
          <li>
            <i class="pi pi-check-circle" aria-hidden="true" />
            <span>Appuyez sur <strong>Ajouter</strong>.</span>
          </li>
        </ol>
        <Button label="Compris" class="pwa-install-ios-close" @click="closeIosSheet" />
      </div>
    </Dialog>
  </template>
</template>

<style scoped>
.pwa-install-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 1rem;
  color: var(--p-primary-color, #3b82f6);
  cursor: pointer;
  background: color-mix(in srgb, var(--p-primary-color, #3b82f6) 8%, transparent);
  border: 0;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.pwa-install-button:hover {
  background: color-mix(in srgb, var(--p-primary-color, #3b82f6) 14%, transparent);
}

.pwa-install-ios-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.25rem;
}

.pwa-install-ios-body h2 {
  margin: 0;
  color: var(--p-text-color);
  font-size: 1.15rem;
  font-weight: 800;
}

.pwa-install-ios-steps {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pwa-install-ios-steps li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--p-text-color);
  font-size: 0.9rem;
}

.pwa-install-ios-steps i {
  flex: 0 0 auto;
  color: var(--p-primary-color, #3b82f6);
  font-size: 1.1rem;
}

.pwa-install-ios-close {
  width: 100%;
}
</style>
