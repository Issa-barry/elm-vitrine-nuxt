<script setup lang="ts">
// Action secondaire, plus discrète que le CTA principal (Mon espace /
// Connexion) sous lequel ce bouton s'affiche — jamais un remplacement,
// l'installation reste facultative (demande du 29/08/2026). Toute la
// détection plateforme/état vit dans composables/usePwaInstall.ts, ce
// composant ne fait qu'afficher le bon état.
const { state: installState, showIosSheet, initialize, promptInstall, closeIosSheet } = usePwaInstall();

onMounted(() => {
  initialize();
});
</script>

<template>
  <template v-if="installState !== 'hidden'">
    <button type="button" class="pwa-install-button" @click="promptInstall">
      <i class="pi pi-download" aria-hidden="true" />
      <span>Installer l'application</span>
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
