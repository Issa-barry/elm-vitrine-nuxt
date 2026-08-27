<script setup lang="ts">
import type { ClientDashboardResponse, DashboardPeriod, DashboardQuery, DashboardVehiculeBalance } from "~/config/clientDashboard";

// Refonte du 27/08/2026 (chantier relayé par une session Claude parallèle,
// "elm-vitrine-nuxt-a4") : la page passe d'une liste de commissions
// individuelles (une ligne par commande) à une vraie vue STATISTIQUE des
// gains — combien, quand, quel véhicule, sur quelle période. Réutilise
// GET /v1/mobile/dashboard (même moteur que le tableau de bord,
// ClientEarningsService) plutôt que GET /v1/mobile/vehicules/{id}/commissions
// (composables/useClientCommissions.ts, conservé mais plus utilisé ici) :
// ce dernier ne couvre QUE les commissions de vente (CommissionEnveloppePart),
// pas la logistique — même limitation documentée que l'ancien /gains/mine
// déconseillé (voir docs/api-espace-client-contract.md §5) — l'utiliser
// aurait risqué un total divergent de celui, faisant autorité, affiché sur
// le tableau de bord.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Commissions — Eau La Maman" });

const { dashboard, isLoading, error, fetchDashboard } = useClientDashboard();
const { vehicles: ownedVehicles, fetchVehicles } = useClientVehicles();
const requestFetch = useRequestFetch();
const route = useRoute();

// "tous" plutôt que "" — voir le même correctif déjà appliqué sur
// depenses.vue/activite.vue/vehicules.vue (PrimeVue Select affiche son
// placeholder tant que la modelValue est vide, même avec une option
// `{ value: "" }` existante).
const ALL = "tous";

type PeriodFilterValue = DashboardPeriod | "aujourdhui";

const periodOptions: Array<{ label: string; value: PeriodFilterValue }> = [
  { label: "Aujourd'hui", value: "aujourdhui" },
  { label: "7 derniers jours", value: "7j" },
  { label: "30 derniers jours", value: "30j" },
  { label: "Ce mois", value: "ce_mois" },
  { label: "Mois précédent", value: "mois_passe" },
  { label: "Période personnalisée", value: "custom" },
];

const periodFilter = ref<PeriodFilterValue>("ce_mois");
const customDateDebut = ref("");
const customDateFin = ref("");
// Pré-rempli depuis ?vehicule_id=... (voir pages/espace-client/index.vue,
// carte "Solde par véhicule").
const vehiculeFilter = ref<string>(typeof route.query.vehicule_id === "string" ? route.query.vehicule_id : ALL);

const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: ALL },
  ...ownedVehicles.value.map((vehicle) => ({ label: `${vehicle.nom} · ${vehicle.immatriculation}`, value: vehicle.id })),
]);

function buildDashboardQuery(): DashboardQuery | null {
  const vehiculeId = vehiculeFilter.value !== ALL ? vehiculeFilter.value : undefined;

  if (periodFilter.value === "aujourdhui") {
    const today = new Date().toISOString().slice(0, 10);
    return { period: "custom", date_debut: today, date_fin: today, vehicule_id: vehiculeId };
  }
  if (periodFilter.value === "custom") {
    // Requête retardée tant que les deux bornes ne sont pas saisies — mieux
    // qu'un appel avec une seule date (résultat trompeur/partiel).
    if (!customDateDebut.value || !customDateFin.value) return null;
    return { period: "custom", date_debut: customDateDebut.value, date_fin: customDateFin.value, vehicule_id: vehiculeId };
  }
  return { period: periodFilter.value, vehicule_id: vehiculeId };
}

// Comparaison de tendance RÉELLE (comme pages/espace-client/index.vue) —
// uniquement pour "ce_mois", seul cas où un raccourci nommé équivalent
// ("mois_passe") existe côté backend pour la période immédiatement
// précédente. Pour les autres périodes (7j, 30j, personnalisée...), aucune
// tendance n'est affichée plutôt que d'inventer une comparaison approximative.
const previousDashboard = ref<ClientDashboardResponse | null>(null);

async function loadDashboard() {
  const query = buildDashboardQuery();
  if (!query) return;

  await fetchDashboard(query);

  if (periodFilter.value === "ce_mois") {
    try {
      previousDashboard.value = await requestFetch<ClientDashboardResponse>("/api/client/dashboard", {
        query: { period: "mois_passe", vehicule_id: query.vehicule_id },
      });
    } catch {
      previousDashboard.value = null;
    }
  } else {
    previousDashboard.value = null;
  }
}

onMounted(() => {
  loadDashboard();
  fetchVehicles();
});

watch([periodFilter, vehiculeFilter, customDateDebut, customDateFin], loadDashboard);

const summary = computed(() => dashboard.value?.summary ?? null);
const previousSummary = computed(() => previousDashboard.value?.summary ?? null);

const earnedTrend = computed(() => (summary.value && previousSummary.value)
  ? computeKpiTrend(summary.value.total_earned, previousSummary.value.total_earned)
  : null);
const operationsTrend = computed(() => (summary.value && previousSummary.value)
  ? computeKpiTrend(summary.value.operations_count, previousSummary.value.operations_count)
  : null);
const balanceTrend = computed(() => (summary.value && previousSummary.value)
  ? computeKpiTrend(summary.value.balance, previousSummary.value.balance)
  : null);

// Triés par gain décroissant, égalité départagée par nom (demande du
// 27/08/2026, section 11) — jamais un tri côté backend supposé, refait ici
// explicitement sur les montants réels déjà reçus.
const sortedParVehicule = computed(() => [...(dashboard.value?.par_vehicule ?? [])].sort(
  (a, b) => b.total_earned - a.total_earned || a.nom_vehicule.localeCompare(b.nom_vehicule, "fr"),
));

// Part relative simple (% du total réel) — explicitement autorisée (demande
// du 27/08/2026, section 15 : "calculer une part relative simple si le total
// backend est fiable"), jamais une formule financière (net à payer, etc.).
function vehiclePercent(vehicle: DashboardVehiculeBalance): number {
  const total = summary.value?.total_earned ?? 0;
  return total > 0 ? Math.round((vehicle.total_earned / total) * 100) : 0;
}

const hasNoCommissions = computed(() => summary.value?.operations_count === 0);
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-commissions-title">
    <ClientMobilePageTopbar title="Commissions" title-id="mobile-commissions-title" />
    <p class="client-mobile-page-intro">Suivez vos gains sur la période sélectionnée.</p>

    <div class="client-commissions-filters">
      <Select v-model="periodFilter" :options="periodOptions" option-label="label" option-value="value" fluid />
      <Select v-model="vehiculeFilter" :options="vehiculeOptions" option-label="label" option-value="value" fluid />
    </div>
    <div v-if="periodFilter === 'custom'" class="client-commissions-custom-dates">
      <label>Du <input v-model="customDateDebut" type="date"></label>
      <label>Au <input v-model="customDateFin" type="date"></label>
    </div>

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="isLoading && !dashboard" class="p-4 text-muted-color" role="status">Chargement des commissions…</div>

    <template v-else-if="summary">
      <div class="client-mobile-expenses__summary">
        <span>Gains générés</span>
        <strong>{{ formatGnf(summary.total_earned) }}</strong>
        <small v-if="earnedTrend">{{ formatKpiTrendPercent(earnedTrend.percent) }} vs mois précédent</small>
        <small v-else>{{ summary.operations_count }} opération{{ summary.operations_count > 1 ? "s" : "" }}</small>
      </div>
      <p v-if="hasNoCommissions" class="text-muted-color text-center">Aucune commission sur cette période.</p>

      <div class="client-mobile-expenses__summary">
        <span>Reste à payer</span>
        <strong>{{ formatGnf(summary.balance) }}</strong>
        <small>Déjà payé : {{ formatGnf(summary.total_paid) }}</small>
      </div>

      <section class="client-mobile-expenses__chart" aria-labelledby="commissions-evolution-title">
        <div class="client-mobile-expenses__chart-heading">
          <h2 id="commissions-evolution-title">Évolution des gains</h2>
        </div>
        <p class="text-muted-color text-sm mb-0">
          Bientôt disponible — nécessite un endpoint backend dédié (série temporelle), voir le rapport de ce chantier.
        </p>
      </section>

      <section v-if="sortedParVehicule.length" class="client-mobile-expenses__chart" aria-labelledby="commissions-by-vehicle-title">
        <div class="client-mobile-expenses__chart-heading">
          <h2 id="commissions-by-vehicle-title">Gains par véhicule</h2>
          <span>Sur la période</span>
        </div>
        <div class="client-mobile-expenses__chart-rows">
          <div v-for="vehicle in sortedParVehicule" :key="vehicle.vehicule_id" class="client-mobile-expenses__chart-row">
            <div>
              <strong>{{ vehicle.nom_vehicule }}</strong>
              <span>{{ formatGnf(vehicle.total_earned) }} · {{ vehiclePercent(vehicle) }}%</span>
            </div>
            <div
              class="client-mobile-expenses__chart-track"
              role="progressbar"
              :aria-label="`${vehicle.nom_vehicule}, ${formatGnf(vehicle.total_earned)}, ${vehiclePercent(vehicle)}%`"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="vehiclePercent(vehicle)"
            >
              <span :style="{ width: `${vehiclePercent(vehicle)}%` }" />
            </div>
          </div>
        </div>
      </section>
      <p v-else class="client-mobile-empty-state">Aucun véhicule associé pour le moment.</p>
    </template>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div v-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="isLoading && !dashboard" class="col-span-12"><div class="card text-muted-color" role="status">Chargement des commissions…</div></div>

    <template v-else-if="summary">
      <div class="col-span-12">
        <div class="card !mb-0">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="font-semibold text-xl">Commissions</div>
              <p class="text-muted-color mt-1 mb-0">Suivez vos gains sur la période sélectionnée.</p>
            </div>
            <div class="flex flex-wrap gap-2 w-full sm:w-auto">
              <Select v-model="periodFilter" :options="periodOptions" option-label="label" option-value="value" class="w-full sm:w-52" />
              <Select v-model="vehiculeFilter" :options="vehiculeOptions" option-label="label" option-value="value" class="w-full sm:w-56" />
              <template v-if="periodFilter === 'custom'">
                <input v-model="customDateDebut" type="date" class="client-commissions-desktop-date">
                <input v-model="customDateFin" type="date" class="client-commissions-desktop-date">
              </template>
            </div>
          </div>
          <p v-if="hasNoCommissions" class="text-muted-color mt-4 mb-0">Aucune commission sur cette période.</p>
        </div>
      </div>

      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard label="Gains générés" :value="formatGnf(summary.total_earned)" :trend="earnedTrend" />
      </div>
      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard label="Opérations" :value="String(summary.operations_count)" :trend="operationsTrend" />
      </div>
      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard
          label="Reste à payer"
          :value="formatGnf(summary.balance)"
          :trend="balanceTrend"
          secondary-label="Déjà payé"
          :secondary-value="formatGnf(summary.total_paid)"
        />
      </div>

      <div class="col-span-12 xl:col-span-6">
        <div class="card h-full">
          <div class="font-semibold text-xl mb-4">Évolution des gains</div>
          <div class="flex flex-col items-center justify-center text-center py-12" role="status">
            <i class="pi pi-chart-line text-muted-color !text-3xl mb-3" aria-hidden="true" />
            <strong class="text-lg">Bientôt disponible</strong>
            <p class="text-muted-color mt-2 mb-0">Nécessite un endpoint backend dédié (série temporelle) — voir le rapport de ce chantier.</p>
          </div>
        </div>
      </div>

      <div class="col-span-12 xl:col-span-6">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold text-xl">Gains par véhicule</div>
            <span class="text-muted-color">Sur la période</span>
          </div>
          <ul v-if="sortedParVehicule.length" class="list-none p-0 m-0">
            <li v-for="vehicle in sortedParVehicule" :key="vehicle.vehicule_id" class="py-3 border-b border-surface last:border-b-0">
              <div class="flex items-center justify-between gap-4 mb-2">
                <div class="min-w-0">
                  <span class="block text-surface-900 dark:text-surface-0 font-semibold">{{ vehicle.nom_vehicule }}</span>
                  <span class="block text-muted-color text-sm">{{ vehicle.immatriculation }}</span>
                </div>
                <div class="shrink-0 text-right">
                  <strong class="block text-surface-900 dark:text-surface-0">{{ formatGnf(vehicle.total_earned) }}</strong>
                  <span class="block text-muted-color text-sm">{{ vehiclePercent(vehicle) }}%</span>
                </div>
              </div>
              <div
                class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2"
                role="progressbar"
                :aria-label="`${vehicle.nom_vehicule}, ${vehiclePercent(vehicle)}%`"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="vehiclePercent(vehicle)"
              >
                <div class="bg-primary h-2 rounded-full" :style="{ width: `${vehiclePercent(vehicle)}%` }" />
              </div>
            </li>
          </ul>
          <p v-else class="text-muted-color">Aucun véhicule associé pour le moment.</p>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>

<style lang="scss" scoped>
.client-commissions-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  > * {
    flex: 1;
  }
}

.client-commissions-custom-dates {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;

  label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--p-text-muted-color);
  }

  input {
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--p-content-border-radius);
    padding: 0.5rem;
  }
}

.client-commissions-desktop-date {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  padding: 0.5rem;
}
</style>
