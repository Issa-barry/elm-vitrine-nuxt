<script setup lang="ts">
// backTo="back" déclenche un retour dans l'historique du navigateur (utile
// quand la page est atteignable depuis plusieurs endroits, ex. Profil) ;
// toute autre valeur reste une destination fixe (ex. détail véhicule -> liste).
const props = withDefaults(defineProps<{
  title: string;
  titleId?: string;
  backTo?: string;
  backLabel?: string;
  filterLabel?: string;
  filterCount?: number;
}>(), {
  titleId: undefined,
  backTo: undefined,
  backLabel: "Retour",
  filterLabel: undefined,
  filterCount: 0,
});

defineEmits<{ filter: [] }>();

const router = useRouter();
const isHistoryBack = computed(() => props.backTo === "back");
const goBack = () => router.back();
</script>

<template>
  <header class="client-mobile-page-topbar">
    <button
      v-if="isHistoryBack"
      type="button"
      class="client-mobile-page-topbar__action"
      :aria-label="backLabel"
      @click="goBack"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
    </button>
    <NuxtLink v-else-if="backTo" :to="backTo" class="client-mobile-page-topbar__action" :aria-label="backLabel">
      <i class="pi pi-arrow-left" aria-hidden="true" />
    </NuxtLink>
    <span v-else class="client-mobile-page-topbar__spacer" aria-hidden="true" />

    <h1 :id="titleId">{{ title }}</h1>

    <button
      v-if="filterLabel"
      type="button"
      class="client-mobile-page-topbar__filter"
      :aria-label="filterCount ? `${filterLabel}, ${filterCount} actif${filterCount > 1 ? 's' : ''}` : filterLabel"
      @click="$emit('filter')"
    >
      <i class="pi pi-sliders-h" aria-hidden="true" />
      <span>Filtre</span>
      <strong v-if="filterCount" aria-hidden="true">{{ filterCount }}</strong>
    </button>
    <span v-else class="client-mobile-page-topbar__spacer" aria-hidden="true" />
  </header>
</template>
