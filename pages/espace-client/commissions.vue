<script setup lang="ts">
import type { ClientDashboardResponse, DashboardPeriod, DashboardQuery, DashboardVehiculeBalance } from "~/config/clientDashboard";
import type { PeriodeComptable } from "~/config/clientPeriodeComptable";
import { TOUTE_ANNEE, bornesDepuisLien, periodeComptableQuery, periodePrecedente } from "~/config/clientPeriodeComptable";
import { activiteLabel, ordonnerActivites, partDuTotal, repartitionVisible } from "~/config/clientActivites";

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
//
// Gains multi-activités (ADR 0054 côté elm-monolithe) : le tableau de bord
// compte propriétaire, livreur, parrain et consultant ; la répartition par
// activité s'affiche à partir de deux activités. La liste « Détail des
// commissions » a été retirée de cette page le 05/11/2026 : l'écran reste une vue
// statistique, sans ligne par commission.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Commissions — Eau La Maman" });

const { dashboard, isLoading, error, fetchDashboard } = useClientDashboard();
const { periodeComptable } = useClientPeriodeComptable();
const requestFetch = useRequestFetch();
const route = useRoute();
const filterPanelVisible = ref(false);

// "tous" plutôt que "" — voir le même correctif déjà appliqué sur
// depenses.vue/activite.vue/vehicules.vue (PrimeVue Select affiche son
// placeholder tant que la modelValue est vide, même avec une option
// `{ value: "" }` existante).
const ALL = "tous";

type PeriodFilterValue = DashboardPeriod | "aujourdhui" | "comptable";

const periodOptions: Array<{ label: string; value: PeriodFilterValue }> = [
  { label: "Période comptable", value: "comptable" },
  { label: "Aujourd'hui", value: "aujourdhui" },
  { label: "7 derniers jours", value: "7j" },
  { label: "30 derniers jours", value: "30j" },
  { label: "Ce mois", value: "ce_mois" },
  { label: "Mois précédent", value: "mois_passe" },
  { label: "Période personnalisée", value: "custom" },
];

// ?du=…&au=… : lien de l'accueil sur une période rapide.
const bornesLien = bornesDepuisLien(route.query);
const periodFilter = ref<PeriodFilterValue>(bornesLien ? "custom" : "comptable");
const customDateDebut = ref(bornesLien?.du ?? "");
const customDateFin = ref(bornesLien?.au ?? "");
const draftPeriodFilter = ref<PeriodFilterValue>(periodFilter.value);
const draftCustomDateDebut = ref(customDateDebut.value);
const draftCustomDateFin = ref(customDateFin.value);
// Pré-rempli depuis ?vehicule_id=... (voir pages/espace-client/index.vue,
// carte "Solde par véhicule").
const vehiculeFilter = ref<string>(typeof route.query.vehicule_id === "string" ? route.query.vehicule_id : ALL);
const draftVehiculeFilter = ref(vehiculeFilter.value);
const activeFilterCount = computed(() => Number(periodFilter.value !== "comptable") + Number(vehiculeFilter.value !== ALL));

function openFilterPanel() {
  draftPeriodFilter.value = periodFilter.value;
  draftCustomDateDebut.value = customDateDebut.value;
  draftCustomDateFin.value = customDateFin.value;
  draftVehiculeFilter.value = vehiculeFilter.value;
  filterPanelVisible.value = true;
}

function applyFilters() {
  periodFilter.value = draftPeriodFilter.value;
  customDateDebut.value = draftCustomDateDebut.value;
  customDateFin.value = draftCustomDateFin.value;
  vehiculeFilter.value = draftVehiculeFilter.value;
  filterPanelVisible.value = false;
}

function resetDraftFilters() {
  draftPeriodFilter.value = "comptable";
  draftCustomDateDebut.value = "";
  draftCustomDateFin.value = "";
  draftVehiculeFilter.value = ALL;
}

// Véhicules du dashboard : rattachés (propriétaire, livreur, parrain) puis ceux
// qui portent une part du compte (équipe quittée, consultant). Le libellé dit la
// nature du lien quand le compte n'est pas propriétaire.
const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: ALL },
  ...(dashboard.value?.vehicules ?? []).map((vehicle) => {
    const liens = ordonnerActivites((vehicle.liens ?? []) as string[]).filter((lien) => lien !== "proprietaire");
    const precision = liens.length ? ` (${liens.map(activiteLabel).join(", ")})` : "";
    return { label: `${vehicle.nom_vehicule} · ${vehicle.immatriculation}${precision}`, value: vehicle.id };
  }),
]);

const parActivite = computed(() => dashboard.value?.par_activite ?? []);

function buildDashboardQuery(): DashboardQuery | null {
  const vehiculeId = vehiculeFilter.value !== ALL ? vehiculeFilter.value : undefined;

  if (periodFilter.value === "comptable") {
    return { ...periodeComptableQuery(periodeComptable.value), vehicule_id: vehiculeId };
  }
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
// uniquement entre périodes entières : "ce_mois" et son raccourci "mois_passe", ou
// un mois (une année) comptable et le précédent. Pour les autres périodes (P1/P2,
// 7j, 30j, personnalisée...), aucune tendance n'est affichée plutôt que d'inventer
// une comparaison approximative.
const previousDashboard = ref<ClientDashboardResponse | null>(null);

function buildPreviousQuery(vehiculeId: DashboardQuery["vehicule_id"]): DashboardQuery | null {
  if (periodFilter.value === "ce_mois") return { period: "mois_passe", vehicule_id: vehiculeId };
  const precedente = periodFilter.value === "comptable" ? periodePrecedente(periodeComptable.value) : null;
  return precedente ? { ...periodeComptableQuery(precedente), vehicule_id: vehiculeId } : null;
}

const tendanceLabel = computed(() => (periodFilter.value === "comptable" && periodeComptable.value.mois === TOUTE_ANNEE
  ? "vs année précédente"
  : "vs mois précédent"));

async function loadDashboard() {
  const query = buildDashboardQuery();
  if (!query) return;

  const previousQuery = buildPreviousQuery(query.vehicule_id);
  const isCurrent = await fetchDashboard(query);
  if (!isCurrent) return;

  if (previousQuery) {
    try {
      previousDashboard.value = await requestFetch<ClientDashboardResponse>("/api/client/dashboard", { query: previousQuery });
    } catch {
      previousDashboard.value = null;
    }
  } else {
    previousDashboard.value = null;
  }
}

onMounted(loadDashboard);

watch([periodFilter, vehiculeFilter, customDateDebut, customDateFin, periodeComptable], loadDashboard);

const periodeComptableActive = computed(() => periodFilter.value === "comptable");
const choisirPeriodeComptable = (periode: PeriodeComptable) => {
  periodeComptable.value = periode;
  periodFilter.value = "comptable";
};

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
  return partDuTotal(vehicle.total_earned, summary.value?.total_earned ?? 0);
}

const hasNoCommissions = computed(() => summary.value?.operations_count === 0);
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-commissions-title">
    <ClientMobilePageTopbar
      title="Commissions"
      title-id="mobile-commissions-title"
      filter-label="Filtrer les commissions"
      :filter-count="activeFilterCount"
      @filter="openFilterPanel"
    />

    <ClientPeriodeComptableFilter
      :model-value="periodeComptable"
      :actif="periodeComptableActive"
      :chargement="isLoading"
      :debut="dashboard?.filters.date_debut"
      :fin="dashboard?.filters.date_fin"
      @update:model-value="choisirPeriodeComptable"
    />

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="isLoading && !dashboard" class="p-4 text-muted-color" role="status">Chargement des commissions…</div>

    <template v-else-if="summary">
      <div class="client-mobile-expenses__summary client-commissions-summary">
        <div class="client-commissions-summary__earned">
          <span>Gains générés</span>
          <strong>{{ formatGnf(summary.total_earned) }}</strong>
          <small v-if="earnedTrend">{{ formatKpiTrendPercent(earnedTrend.percent) }} {{ tendanceLabel }}</small>
          <small v-else>{{ summary.operations_count }} opération{{ summary.operations_count > 1 ? "s" : "" }}</small>
        </div>
        <div class="client-commissions-summary__payments">
          <div>
            <span>Reste à payer</span>
            <strong>{{ formatGnf(summary.balance) }}</strong>
          </div>
          <div>
            <span>Déjà payé</span>
            <strong>{{ formatGnf(summary.total_paid) }}</strong>
          </div>
        </div>
      </div>
      <p v-if="hasNoCommissions" class="client-commissions-empty" role="status">Aucune commission sur cette période.</p>

      <ClientRepartitionActivites v-if="repartitionVisible(parActivite)" mobile :par-activite="parActivite" :total="summary.total_earned" />

      <section class="client-mobile-expenses__chart" aria-labelledby="commissions-evolution-title">
        <div class="client-mobile-expenses__chart-heading">
          <h2 id="commissions-evolution-title">Évolution des gains</h2>
        </div>
        <p class="text-muted-color text-sm mb-0">
          Bientôt disponible
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

  <Drawer
    v-model:visible="filterPanelVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    header="Filtrer les commissions"
    class="client-delivery-filter-drawer"
  >
    <form id="client-commissions-filter-form" class="client-delivery-filter" @submit.prevent="applyFilters">
      <div class="client-delivery-filter__grid">
        <label class="client-delivery-filter__field">
          <span>Période</span>
          <Select v-model="draftPeriodFilter" :options="periodOptions" option-label="label" option-value="value" fluid />
        </label>
        <template v-if="draftPeriodFilter === 'custom'">
          <label class="client-delivery-filter__field">
            <span>Du</span>
            <input v-model="draftCustomDateDebut" type="date" class="client-delivery-filter__date">
          </label>
          <label class="client-delivery-filter__field">
            <span>Au</span>
            <input v-model="draftCustomDateFin" type="date" class="client-delivery-filter__date">
          </label>
        </template>
        <label class="client-delivery-filter__field">
          <span>Véhicule</span>
          <Select v-model="draftVehiculeFilter" :options="vehiculeOptions" option-label="label" option-value="value" fluid />
        </label>
      </div>
    </form>
    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="resetDraftFilters" />
        <Button
          type="submit"
          form="client-commissions-filter-form"
          label="Appliquer"
          :disabled="draftPeriodFilter === 'custom' && (!draftCustomDateDebut || !draftCustomDateFin)"
        />
      </div>
    </template>
  </Drawer>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <ClientPeriodeComptableFilter
        class="!mb-0"
        :model-value="periodeComptable"
        :actif="periodeComptableActive"
        :chargement="isLoading"
        :debut="dashboard?.filters.date_debut"
        :fin="dashboard?.filters.date_fin"
        @update:model-value="choisirPeriodeComptable"
      />
    </div>
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

      <div v-if="repartitionVisible(parActivite)" class="col-span-12">
        <ClientRepartitionActivites class="!mb-0" :par-activite="parActivite" :total="summary.total_earned" />
      </div>
    </template>
  </div>
  </div>
</template>

<style lang="scss" scoped>
.client-commissions-summary {
  gap: 0;
  padding: 1.1rem;
  margin: 0 0 0.75rem;
}

.client-commissions-summary__earned {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.9rem;
}

.client-commissions-summary__earned strong {
  font-size: 1.75rem;
  line-height: 1.15;
}

.client-commissions-summary__payments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding-top: 0.8rem;
  border-top: 1px solid color-mix(in srgb, var(--primary-contrast-color) 28%, transparent);
}

.client-commissions-summary__payments > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.client-commissions-summary__payments > div + div {
  padding-left: 0.75rem;
  border-left: 1px solid color-mix(in srgb, var(--primary-contrast-color) 28%, transparent);
}

.client-commissions-summary__payments span {
  opacity: 0.82;
  font-size: 0.7rem;
}

.client-commissions-summary__payments strong {
  overflow-wrap: anywhere;
  font-size: 0.95rem;
  font-weight: 800;
}

.client-commissions-empty {
  margin: -0.2rem 0 0.85rem;
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
  text-align: center;
}

.client-commissions-desktop-date {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  padding: 0.5rem;
}
</style>
