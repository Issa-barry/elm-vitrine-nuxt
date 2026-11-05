<script setup lang="ts">
import { activiteIcon, activiteLabel } from "~/config/clientActivites";

// Origine d'une commission ou nature du lien avec un véhicule (ADR 0054 côté
// elm-monolithe). Badge de CATÉGORIE, pas de statut : couleur neutre, l'icône et
// le libellé suffisent à distinguer les activités. `precision` : entreprise d'un
// consultant, par exemple.
const props = defineProps<{
  activite: string;
  precision?: string | null;
}>();

const libelle = computed(() => (props.precision ? `${activiteLabel(props.activite)} · ${props.precision}` : activiteLabel(props.activite)));
</script>

<template>
  <Tag
    class="client-activite-badge"
    :icon="activiteIcon(activite)"
    :value="libelle"
    severity="secondary"
    :data-activite="activite"
  />
</template>

<style scoped>
.client-activite-badge {
  font-weight: 600;
  white-space: nowrap;
}
</style>
