<script setup lang="ts">
// Carte KPI desktop / tablette paysage — reprend fidèlement le markup/classes
// de _template/apollo-vue-6.2.0/src/components/dashboard/ecommerce/
// StatsEcommerceWidget.vue (carte "Sales"/"Revenue"/"Visitors" : .card h-full,
// titre en haut, gros montant + variation % à gauche, mini line chart à
// droite) plutôt que d'être redessinée de mémoire. Voir pages/espace-client/
// index.vue pour les 4 instances (Commission générée, Dépenses, Net à payer,
// Reste à payer) et le rapport de session pour le détail des écarts assumés
// (tailles de police adaptées : nos montants GNF sont bien plus longs que
// les "120"/"$4500" de la démo Apollo).
interface Trend {
  percent: number;
  /** Couleur découplée du signe : une hausse n'est pas toujours "positive"
   * (ex. Dépenses) — voir pages/espace-client/index.vue. */
  tone: "positive" | "negative";
}

interface Props {
  label: string;
  value: string;
  /** null/undefined => aucun historique comparable disponible : état neutre
   * (pas de pourcentage inventé), voir la note dans index.vue. */
  trend?: Trend | null;
  /** Valeurs réelles pour le mini-tracé (ex. répartition par véhicule).
   * null/vide => pas de série réelle disponible : ligne neutre plate. */
  series?: number[] | null;
  secondaryLabel?: string;
  secondaryValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: null,
  series: null,
});

// Tracé SVG généré à partir de vraies valeurs (comme Apollo, qui n'utilise
// aucune librairie de graphique : juste un <path> dessiné à la main sur un
// viewBox fixe) — jamais de courbe décorative inventée.
const path = computed(() => {
  const values = props.series;
  const width = 100;
  const height = 36;
  const padding = 4;

  if (!values || values.length < 2) {
    const y = height / 2;
    return `M${padding},${y} L${width - padding},${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + stepX * index;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
});

const hasSeries = computed(() => !!props.series && props.series.length > 0);

const strokeColor = computed(() => {
  if (!hasSeries.value) return "var(--surface-border)";
  if (!props.trend) return "var(--primary-color)";
  return props.trend.tone === "positive" ? "var(--p-green-500)" : "var(--p-red-500)";
});
</script>

<template>
  <div class="card h-full !mb-0">
    <span class="font-semibold text-lg">{{ label }}</span>
    <div class="flex justify-between items-start gap-4 mt-4">
      <div class="w-7/12 min-w-0">
        <span class="block font-bold text-surface-900 dark:text-surface-0 text-xl md:text-2xl xl:text-3xl leading-tight">{{ value }}</span>

        <div v-if="trend" class="mt-1" :class="trend.tone === 'positive' ? 'text-green-500' : 'text-red-500'">
          <span class="font-medium">{{ trend.percent > 0 ? "+" : "" }}{{ trend.percent }}%</span>
          <i class="pi text-xs ml-2" :class="trend.percent >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'" />
        </div>
        <div v-else class="mt-1 text-muted-color">
          <span class="font-medium">—</span>
        </div>

        <div v-if="secondaryLabel" class="mt-2 text-sm text-muted-color">
          {{ secondaryLabel }}<template v-if="secondaryValue">&nbsp;: <strong class="text-surface-900 dark:text-surface-0 font-medium">{{ secondaryValue }}</strong></template>
        </div>
      </div>
      <div class="w-5/12">
        <svg width="100%" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <path :d="path" fill="none" :stroke="strokeColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :opacity="hasSeries ? 1 : 0.5" />
        </svg>
      </div>
    </div>
  </div>
</template>
