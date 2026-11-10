<script setup lang="ts">
// Ancienne adresse de « Livraisons », remplacée par « Commandes » (ADR 0058 côté
// elm-monolithe). Conservée pour les favoris, les notifications déjà reçues et
// les service workers installés avant le changement : `?commande=` est transmis.
definePageMeta({
  middleware: [
    (to) => navigateTo({ path: "/espace-client/commandes", query: to.query, hash: to.hash }, { replace: true, redirectCode: 301 }),
  ],
});
</script>

<template>
  <div />
</template>
