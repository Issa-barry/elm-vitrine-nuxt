<script setup lang="ts">
// UI discrète, pas de popup au premier chargement : ce bandeau ne s'affiche
// que quand $pwa.needRefresh passe à true, c'est-à-dire quand un nouveau
// service worker est déjà en attente (voir docs/pwa.md § mise à jour).
const pwa = usePWA();
</script>

<template>
  <div v-if="pwa?.needRefresh" class="pwa-update-toast" role="status" aria-live="polite">
    <p class="pwa-update-toast__text">Nouvelle version disponible</p>
    <button type="button" class="pwa-update-toast__action" @click="pwa.updateServiceWorker(true)">
      Mettre à jour
    </button>
  </div>
</template>

<style scoped>
.pwa-update-toast {
  position: fixed;
  inset-inline: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 24rem;
  margin-inline: auto;
  padding: 0.75rem 0.75rem 0.75rem 1rem;
  border-radius: 0.75rem;
  background-color: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
}

.pwa-update-toast__text {
  margin: 0;
  font-size: 0.875rem;
  color: #1f2937;
}

.pwa-update-toast__action {
  flex-shrink: 0;
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  background-color: var(--p-primary-color, #3b82f6);
  cursor: pointer;
}

.pwa-update-toast__action:hover {
  background-color: var(--p-primary-hover-color, #2563eb);
}
</style>
