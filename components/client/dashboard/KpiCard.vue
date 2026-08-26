<script setup lang="ts">
// Carte KPI desktop / tablette paysage — markup/classes repris de
// _template/apollo-vue-6.2.0/src/components/dashboard/ecommerce/
// StatsEcommerceWidget.vue (titre en haut, gros montant, variation %),
// sans le mini line chart : retiré à la demande explicite du 2026-08-26
// (surchargeait des cartes déjà denses une fois les % réels en place).
// Voir pages/espace-client/index.vue pour les 4 instances et
// utils/kpiTrend.ts pour le calcul/l'arrondi de la variation.
interface Trend {
  /** Pourcentage brut, non arrondi — voir utils/kpiTrend.ts. */
  percent: number;
  /** Couleur découplée du signe : une hausse n'est pas toujours "positive"
   * (ex. Dépenses) — voir pages/espace-client/index.vue. */
  tone: "positive" | "negative";
}

interface Props {
  label: string;
  value: string;
  /** null/undefined => aucune comparaison calculable (période précédente à
   * 0, données absentes) : état neutre, jamais de pourcentage inventé. */
  trend?: Trend | null;
  secondaryLabel?: string;
  secondaryValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: null,
});

// Une variation qui s'arrondit à 0 est "stable" : affichée "0%" en neutre,
// sans flèche ni couleur de tone — distinct du cas "pas de trend du tout"
// (tiret) où la comparaison n'était pas calculable.
const roundedPercent = computed(() => props.trend ? roundKpiTrendPercent(props.trend.percent) : null);
const trendLabel = computed(() => props.trend ? formatKpiTrendPercent(props.trend.percent) : "");
</script>

<template>
  <div class="card h-full !mb-0">
    <span class="font-semibold text-lg">{{ label }}</span>
    <span class="block font-bold text-surface-900 dark:text-surface-0 text-2xl leading-tight mt-4 whitespace-nowrap">{{ value }}</span>

    <div
      v-if="trend"
      class="mt-1"
      :class="roundedPercent === 0 ? 'text-muted-color' : (trend.tone === 'positive' ? 'text-green-500' : 'text-red-500')"
    >
      <span class="font-medium">{{ trendLabel }}</span>
      <i v-if="roundedPercent !== 0" class="pi text-xs ml-2" :class="roundedPercent! > 0 ? 'pi-arrow-up' : 'pi-arrow-down'" />
    </div>
    <div v-else class="mt-1 text-muted-color">
      <span class="font-medium">—</span>
    </div>

    <div v-if="secondaryLabel" class="mt-2 text-sm text-muted-color">
      {{ secondaryLabel }}<template v-if="secondaryValue">&nbsp;: <strong class="text-surface-900 dark:text-surface-0 font-medium">{{ secondaryValue }}</strong></template>
    </div>
  </div>
</template>
