<script setup lang="ts">
import { activiteLabel, partDuTotal, trierActivitesParGain } from "~/config/clientActivites";
import type { ActiviteGains } from "~/config/clientCommissionsCompte";

// Répartition des gains par activité (ADR 0054 côté elm-monolithe) : même
// présentation que « Gains par véhicule » sur la page Commissions, en mobile comme
// au bureau. Montants du backend (`par_activite`, dont la somme est `summary`) ; la
// page ne l'affiche qu'à partir de deux activités (repartitionVisible()).
const props = defineProps<{
  parActivite: ActiviteGains[];
  total: number;
  mobile?: boolean;
}>();

const titreId = useId();
const lignes = computed(() => trierActivitesParGain(props.parActivite).map((ligne) => ({
  activite: ligne.activite,
  libelle: activiteLabel(ligne.activite),
  montant: formatGnf(ligne.total_earned),
  part: partDuTotal(ligne.total_earned, props.total),
})));
</script>

<template>
  <section v-if="mobile" class="client-mobile-expenses__chart" :aria-labelledby="titreId" data-testid="repartition-activites">
    <div class="client-mobile-expenses__chart-heading">
      <h2 :id="titreId">Répartition par activité</h2>
      <span>Sur la période</span>
    </div>
    <div class="client-mobile-expenses__chart-rows">
      <div v-for="ligne in lignes" :key="ligne.activite" class="client-mobile-expenses__chart-row" :data-activite="ligne.activite">
        <div>
          <strong>{{ ligne.libelle }}</strong>
          <span>{{ ligne.montant }} · {{ ligne.part }}%</span>
        </div>
        <div
          class="client-mobile-expenses__chart-track"
          role="progressbar"
          :aria-label="`${ligne.libelle}, ${ligne.montant}, ${ligne.part}%`"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="ligne.part"
        >
          <span :style="{ width: `${ligne.part}%` }" />
        </div>
      </div>
    </div>
  </section>

  <section v-else class="card" :aria-labelledby="titreId" data-testid="repartition-activites">
    <div class="flex items-center justify-between mb-4">
      <div :id="titreId" class="font-semibold text-xl">Répartition par activité</div>
      <span class="text-muted-color">Sur la période</span>
    </div>
    <ul class="list-none p-0 m-0">
      <li v-for="ligne in lignes" :key="ligne.activite" class="py-3 border-b border-surface last:border-b-0" :data-activite="ligne.activite">
        <div class="flex items-center justify-between gap-4 mb-2">
          <span class="min-w-0 text-surface-900 dark:text-surface-0 font-semibold">{{ ligne.libelle }}</span>
          <div class="shrink-0 text-right">
            <strong class="block text-surface-900 dark:text-surface-0">{{ ligne.montant }}</strong>
            <span class="block text-muted-color text-sm">{{ ligne.part }}%</span>
          </div>
        </div>
        <div
          class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2"
          role="progressbar"
          :aria-label="`${ligne.libelle}, ${ligne.part}%`"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="ligne.part"
        >
          <div class="bg-primary h-2 rounded-full" :style="{ width: `${ligne.part}%` }" />
        </div>
      </li>
    </ul>
  </section>
</template>
