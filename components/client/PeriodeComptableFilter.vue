<script setup lang="ts">
import type { PeriodeComptable, Quinzaine } from "~/config/clientPeriodeComptable";
import { MOIS, QUINZAINES, TOUTE_ANNEE, anneesProposees, bornesLabel, periodeComptableCourante } from "~/config/clientPeriodeComptable";

// `actif` à false : un autre filtre de période de l'écran s'applique à la place.
// Toucher ce filtre le réactive, d'où un événement même sur la valeur déjà choisie.
const props = withDefaults(defineProps<{
  modelValue: PeriodeComptable;
  actif?: boolean;
  chargement?: boolean;
  debut?: string | null;
  fin?: string | null;
  // Sans la ligne d'information (bornes, état) : panneau où la sélection n'est pas encore appliquée.
  compact?: boolean;
}>(), {
  actif: true,
  chargement: false,
  debut: null,
  fin: null,
  compact: false,
});

const emit = defineEmits<{ "update:modelValue": [value: PeriodeComptable] }>();

const annees = computed(() => {
  const proposees = anneesProposees(periodeComptableCourante().annee);
  const options = proposees.includes(props.modelValue.annee) ? proposees : [...proposees, props.modelValue.annee];
  return options.map((annee) => ({ value: annee, label: String(annee) }));
});

const bornes = computed(() => bornesLabel(props.debut, props.fin));

const changer = (changement: Partial<PeriodeComptable>) => emit("update:modelValue", { ...props.modelValue, ...changement });
const choisirQuinzaine = (quinzaine: Quinzaine) => changer({ quinzaine });
const choisirMois = (mois: number) => changer(mois === TOUTE_ANNEE ? { mois, quinzaine: "TOUT" } : { mois });
</script>

<template>
  <section class="client-periode-comptable" :aria-busy="chargement" aria-label="Période comptable">
    <div class="client-periode-comptable__selects">
      <Select
        :model-value="modelValue.annee"
        :options="annees"
        option-label="label"
        option-value="value"
        aria-label="Année"
        fluid
        @update:model-value="changer({ annee: $event })"
      />
      <Select
        :model-value="modelValue.mois"
        :options="MOIS"
        option-label="label"
        option-value="value"
        aria-label="Mois"
        fluid
        @update:model-value="choisirMois"
      />
    </div>
    <div v-if="modelValue.mois !== TOUTE_ANNEE" class="client-periode-comptable__quinzaines" role="group" aria-label="Quinzaine">
      <button
        v-for="quinzaine in QUINZAINES"
        :key="quinzaine.value"
        type="button"
        :class="{ 'is-active': actif && modelValue.quinzaine === quinzaine.value }"
        :aria-pressed="actif && modelValue.quinzaine === quinzaine.value"
        :title="quinzaine.title"
        @click="choisirQuinzaine(quinzaine.value)"
      >
        {{ quinzaine.label }}
      </button>
    </div>
    <p v-if="!compact" class="client-periode-comptable__info" role="status">
      <template v-if="!actif">Une autre période est appliquée. Choisissez un mois ou une quinzaine pour y revenir.</template>
      <template v-else-if="chargement">Chargement…</template>
      <template v-else>{{ bornes }}</template>
    </p>
  </section>
</template>

<style lang="scss" scoped>
.client-periode-comptable {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.client-periode-comptable__selects {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 0.5rem;
}

.client-periode-comptable__quinzaines {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);

  button {
    min-height: 2.5rem;
    padding: 0.25rem;
    color: var(--p-text-color);
    background: transparent;
    border: 0;
    border-radius: var(--p-content-border-radius);
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;

    &.is-active {
      color: var(--p-primary-contrast-color);
      background: var(--p-primary-color);
    }

    &:focus-visible {
      outline: 2px solid var(--p-primary-color);
      outline-offset: 2px;
    }
  }
}

.client-periode-comptable__info {
  min-height: 1.125rem;
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

@media (min-width: 768px) {
  .client-periode-comptable {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .client-periode-comptable__selects {
    grid-template-columns: 7rem 10rem;
  }

  .client-periode-comptable__quinzaines {
    grid-template-columns: repeat(3, 7.5rem);
  }
}
</style>
