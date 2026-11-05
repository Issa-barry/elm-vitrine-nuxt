<script setup lang="ts">
import type { ExpenseStatus } from "~/config/clientExpenses";
import { customPeriodError, groupExpensesByMonth } from "~/config/clientExpenses";
import type { PeriodeComptable, PeriodeRapide } from "~/config/clientPeriodeComptable";
import {
  PERIODES_RAPIDES,
  bornesDepuisLien,
  estMoisCourant,
  periodeComptableCourante,
  periodeComptableLabel,
  periodeComptableQuery,
  periodeRapideLabel,
} from "~/config/clientPeriodeComptable";

definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Dépenses — Eau La Maman" });

const { response, isLoading, error, hasLoaded, fetchExpenses } = useClientExpenses();
const { vehicles: ownedVehicles, fetchVehicles } = useClientVehicles();
const { periodeComptable, revenirAuMoisCourant } = useClientPeriodeComptable();
const route = useRoute();

const activeExpenseTab = ref<"general" | "details">("general");
// "tous" plutôt que "" comme valeur du filtre par défaut : PrimeVue Select
// traite une modelValue vide ("", null, undefined) comme "aucune sélection"
// et affiche alors son placeholder (jamais défini ici) au lieu du libellé de
// l'option correspondante — même avec une option `{ value: "" }` déjà
// présente dans la liste, le Select restait visuellement vide. "tous" est une
// valeur non vide comme une autre, donc affichée normalement.
const ALL = "tous";

// Mêmes choix que le filtre de l'accueil, bornes calculées par le serveur :
// "comptable" = année/mois/quinzaine (filtre en tête de page, partagé entre les
// écrans), une période rapide (`periode`), ou des dates personnalisées. "Ce mois"
// n'est pas une période rapide de plus : c'est le mois comptable en cours.
type RapideDepense = Exclude<PeriodeRapide, "ce_mois">;
type ExpensePeriodChoice = "comptable" | "custom" | RapideDepense;

const estPeriodeRapide = (valeur: unknown): valeur is RapideDepense =>
  valeur !== "ce_mois" && PERIODES_RAPIDES.some((periode) => periode.value === valeur);

interface ExpenseFiltersState {
  period: ExpensePeriodChoice;
  customStart: string;
  customEnd: string;
  statut: ExpenseStatus | typeof ALL;
  typeLabel: string;
  vehiculeId: string;
}

const createEmptyFilters = (): ExpenseFiltersState => ({
  period: "comptable",
  customStart: "",
  customEnd: "",
  statut: ALL,
  typeLabel: ALL,
  vehiculeId: ALL,
});

// Liens de l'accueil : ?periode=toutes (ou une autre clé de période rapide) ou
// ?du=…&au=… (voir docs/filtre-periode-comptable.md).
const bornesLien = bornesDepuisLien(route.query);
const periodeLien = route.query.periode === "toutes" ? "tout" : route.query.periode;
const appliedFilters = reactive<ExpenseFiltersState>({
  ...createEmptyFilters(),
  ...(bornesLien ? { period: "custom", customStart: bornesLien.du, customEnd: bornesLien.au } : {}),
  ...(estPeriodeRapide(periodeLien) ? { period: periodeLien } : {}),
});
const draftFilters = reactive<ExpenseFiltersState>(createEmptyFilters());
const draftComptable = ref<PeriodeComptable>(periodeComptable.value);
const filterPanelVisible = ref(false);
const periodError = ref("");
const search = ref("");

// Plafond documenté du backend (voir docs/api-espace-client-contract.md §4,
// per_page 1-100) : un seul fetch couvre la quasi-totalité d'un usage réel
// (flotte d'une petite/moyenne organisation). meta.total (réel, jamais
// deviné) permet de signaler honnêtement le dépassement plutôt que de
// prétendre que la liste est complète — voir bandeau plus bas. Période, statut
// et véhicule sont filtrés par le backend ; type et recherche sur le lot chargé,
// faute de liste des types exposée à l'espace client.
async function loadExpenses() {
  await fetchExpenses({
    per_page: 100,
    statut: appliedFilters.statut !== ALL ? appliedFilters.statut : undefined,
    vehicule_id: appliedFilters.vehiculeId !== ALL ? appliedFilters.vehiculeId : undefined,
    ...periodQuery(),
  });
}

function periodQuery() {
  if (appliedFilters.period === "comptable") return periodeComptableQuery(periodeComptable.value);
  if (appliedFilters.period === "custom") return { date_debut: appliedFilters.customStart, date_fin: appliedFilters.customEnd };
  return { periode: appliedFilters.period };
}

onMounted(() => {
  loadExpenses();
  fetchVehicles();
});

watch(
  () => [appliedFilters.period, appliedFilters.customStart, appliedFilters.customEnd, appliedFilters.statut, appliedFilters.vehiculeId, periodeComptable.value],
  loadExpenses,
);

const periodeComptableActive = computed(() => appliedFilters.period === "comptable");
const choisirPeriodeComptable = (periode: PeriodeComptable) => {
  periodeComptable.value = periode;
  Object.assign(appliedFilters, { period: "comptable", customStart: "", customEnd: "" });
};
const voirToutesLesPeriodes = () => { appliedFilters.period = "tout"; };
const periodeVide = computed(() => periodeComptableActive.value && !isLoading.value && !error.value && hasLoaded.value && expenses.value.length === 0);

const expenses = computed(() => response.value?.data ?? []);
const meta = computed(() => response.value?.meta ?? null);
const hasMoreThanShown = computed(() => Boolean(meta.value && meta.value.total > meta.value.per_page));

const filteredExpenses = computed(() => (appliedFilters.typeLabel === ALL
  ? expenses.value
  : expenses.value.filter((expense) => expense.type_label === appliedFilters.typeLabel)));

const normalizeText = (value: string) => value.trim().toLocaleLowerCase("fr");
const searchedExpenses = computed(() => {
  const query = normalizeText(search.value);
  if (!query) return filteredExpenses.value;
  return filteredExpenses.value.filter((expense) => [
    expense.type_label,
    expense.commentaire,
    expense.vehicule?.nom_vehicule,
    expense.vehicule?.immatriculation,
  ].some((value) => value && normalizeText(value).includes(query)));
});

const monthGroups = computed(() => groupExpensesByMonth(searchedExpenses.value));
const collapsedMonths = ref(new Set<string>());
const toggleMonth = (key: string) => {
  const next = new Set(collapsedMonths.value);
  if (!next.delete(key)) next.add(key);
  collapsedMonths.value = next;
};

const expenseCountLabel = (count: number) => `${count} ${count > 1 ? "dépenses" : "dépense"}`;

// "Validées" reste le sous-ensemble affiché par défaut dans le résumé
// général (même comportement que l'ancienne maquette), calculé côté client
// UNIQUEMENT pour l'affichage à partir du lot déjà chargé — jamais un
// second calcul financier (voir demande du 26/08/2026, section 30) : ce sont
// des montants déjà fournis par le backend, seulement filtrés/sommés pour
// l'affichage, pas recalculés.
const validatedExpenses = computed(() => filteredExpenses.value.filter((expense) => expense.statut === "valide"));

const statutOptions: Array<{ label: string; value: ExpenseStatus | typeof ALL }> = [
  { label: "Tous les statuts", value: ALL },
  { label: "Validée", value: "valide" },
  { label: "Soumise", value: "soumis" },
  { label: "Rejetée", value: "rejete" },
  { label: "Annulée", value: "annule" },
  { label: "Brouillon", value: "brouillon" },
];
const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: ALL },
  ...ownedVehicles.value.map((vehicle) => ({ label: `${vehicle.nom} · ${vehicle.immatriculation}`, value: vehicle.id })),
]);
// Types réellement présents dans le lot chargé, jamais une liste inventée. Le
// type déjà filtré reste proposé même s'il disparaît du lot après un changement
// de période.
const typeOptions = computed(() => {
  const labels = new Set(expenses.value.map((expense) => expense.type_label));
  if (appliedFilters.typeLabel !== ALL) labels.add(appliedFilters.typeLabel);
  return [
    { label: "Tous les types", value: ALL },
    ...[...labels].sort((a, b) => a.localeCompare(b, "fr")).map((label) => ({ label, value: label })),
  ];
});

const formatDate = (date: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

// Période sur laquelle porte le "Total validé" : le montant seul ne le dit pas.
const totalPeriodLabel = computed(() => {
  if (appliedFilters.period === "comptable") return periodeComptableLabel(periodeComptable.value);
  if (appliedFilters.period === "custom") return `${formatDate(appliedFilters.customStart)} – ${formatDate(appliedFilters.customEnd)}`;
  return periodeRapideLabel(appliedFilters.period);
});

const activeFilters = computed(() => {
  const filters: Array<{ key: "period" | "statut" | "typeLabel" | "vehiculeId"; label: string; value: string }> = [
    { key: "period", label: "Période", value: appliedFilters.period !== "comptable" ? totalPeriodLabel.value : "" },
    { key: "statut", label: "Statut", value: statutOptions.find((option) => option.value === appliedFilters.statut && option.value !== ALL)?.label ?? "" },
    { key: "typeLabel", label: "Type", value: appliedFilters.typeLabel !== ALL ? appliedFilters.typeLabel : "" },
    { key: "vehiculeId", label: "Véhicule", value: appliedFilters.vehiculeId !== ALL
      ? vehiculeOptions.value.find((option) => option.value === appliedFilters.vehiculeId)?.label || appliedFilters.vehiculeId
      : "" },
  ];
  return filters.filter((filter) => Boolean(filter.value));
});

const openFilterPanel = () => {
  Object.assign(draftFilters, appliedFilters);
  draftComptable.value = periodeComptable.value;
  periodError.value = "";
  filterPanelVisible.value = true;
};
const draftPeriodOptions = [...PERIODES_RAPIDES, { value: "custom" as const, label: "Période personnalisée" }];
// Bouton du panneau actif pour la période en brouillon ("Ce mois" = mois comptable en cours).
const draftPeriodeActive = (valeur: PeriodeRapide | "custom") => (valeur === "ce_mois"
  ? draftFilters.period === "comptable" && estMoisCourant(draftComptable.value)
  : draftFilters.period === valeur);
const choisirDraftPeriode = (valeur: PeriodeRapide | "custom") => {
  if (valeur === "ce_mois") {
    draftFilters.period = "comptable";
    draftComptable.value = periodeComptableCourante();
  } else {
    draftFilters.period = valeur;
  }
};
const choisirDraftComptable = (periode: PeriodeComptable) => {
  draftComptable.value = periode;
  draftFilters.period = "comptable";
};
const applyFilters = () => {
  periodError.value = draftFilters.period === "custom" ? customPeriodError(draftFilters.customStart, draftFilters.customEnd) : "";
  if (periodError.value) return;
  Object.assign(appliedFilters, draftFilters);
  if (draftFilters.period === "comptable") periodeComptable.value = draftComptable.value;
  filterPanelVisible.value = false;
};
const resetDraftFilters = () => {
  Object.assign(draftFilters, createEmptyFilters());
  draftComptable.value = periodeComptableCourante();
  periodError.value = "";
};
const removeFilter = (key: "period" | "statut" | "typeLabel" | "vehiculeId") => {
  const empty = createEmptyFilters();
  if (key === "period") {
    Object.assign(appliedFilters, { period: empty.period, customStart: empty.customStart, customEnd: empty.customEnd });
  } else {
    Object.assign(appliedFilters, { [key]: empty[key] });
  }
};
const clearAppliedFilters = () => Object.assign(appliedFilters, createEmptyFilters());
const resetAllFilters = () => {
  search.value = "";
  clearAppliedFilters();
  revenirAuMoisCourant();
};

const statutSeverity = (statut: ExpenseStatus): "success" | "info" | "danger" | "secondary" => {
  if (statut === "valide") return "success";
  if (statut === "soumis") return "info";
  if (statut === "rejete") return "danger";
  return "secondary";
};

// Icône purement présentationnelle par type de dépense — même principe que
// notificationVisual() dans pages/espace-client/index.vue : dérivée d'un code
// réel (type_code), jamais une donnée inventée, repli neutre pour tout code
// non reconnu (le backend peut ajouter des types de dépense sans que ce
// mapping devienne incorrect).
const expenseIcons: Record<string, string> = {
  carburant: "pi pi-bolt",
  peage: "pi pi-ticket",
  entretien: "pi pi-wrench",
};
const expenseIcon = (typeCode: string) => expenseIcons[typeCode] || "pi pi-receipt";

const totalValidatedExpenses = computed(() => validatedExpenses.value.reduce((sum, expense) => sum + expense.montant, 0));
const expenseComparison = computed(() => {
  const byVehicle = new Map<string, { name: string; registration: string; total: number }>();
  for (const expense of validatedExpenses.value) {
    if (!expense.vehicule) continue;
    const key = expense.vehicule.id;
    const entry = byVehicle.get(key) ?? { name: expense.vehicule.nom_vehicule, registration: expense.vehicule.immatriculation, total: 0 };
    entry.total += expense.montant;
    byVehicle.set(key, entry);
  }
  const totals = [...byVehicle.values()];
  const largestTotal = Math.max(...totals.map((vehicle) => vehicle.total), 1);
  return totals.map((vehicle) => ({ ...vehicle, percentage: Math.round((vehicle.total / largestTotal) * 100) }));
});
const expenseComparisonMax = computed(() => Math.max(...expenseComparison.value.map((vehicle) => vehicle.total), 1));
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-expenses-title">
    <ClientMobilePageTopbar
      title="Dépenses"
      title-id="mobile-expenses-title"
      filter-label="Filtrer les dépenses"
      :filter-count="activeFilters.length"
      @filter="openFilterPanel"
    />

    <ClientPeriodeComptableFilter
      :model-value="periodeComptable"
      :actif="periodeComptableActive"
      :chargement="isLoading"
      :debut="response?.filters.date_debut"
      :fin="response?.filters.date_fin"
      @update:model-value="choisirPeriodeComptable"
    />

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="isLoading && !hasLoaded" class="p-4 text-muted-color" role="status">Chargement des dépenses…</div>

    <template v-else>
      <div v-if="activeFilters.length" class="client-delivery-active-filters client-mobile-expenses__active-filters" aria-label="Filtres actifs">
        <button v-for="filter in activeFilters" :key="filter.key" type="button" :aria-label="`Retirer le filtre ${filter.label} : ${filter.value}`" @click="removeFilter(filter.key)">
          <span>{{ filter.label }} : {{ filter.value }}</span>
          <i class="pi pi-times" aria-hidden="true" />
        </button>
        <button type="button" class="is-reset" @click="clearAppliedFilters">Tout effacer</button>
      </div>

      <p v-if="hasMoreThanShown" class="client-mobile-expenses__limit">
        Affichage limité aux {{ meta!.per_page }} dépenses les plus récentes sur {{ meta!.total }} : le plus ancien mois affiché peut être incomplet. Choisissez une période pour voir les autres.
      </p>

      <div v-if="periodeVide" class="client-mobile-expenses__empty" role="status">
        <i class="pi pi-calendar-times" aria-hidden="true" />
        <strong>Aucune dépense sur cette période</strong>
        <Button label="Voir toutes les périodes" severity="secondary" outlined size="small" @click="voirToutesLesPeriodes" />
      </div>

      <div class="client-mobile-expenses__tabs" role="tablist" aria-label="Sections des dépenses">
        <button
          id="expense-tab-general"
          type="button"
          role="tab"
          :aria-selected="activeExpenseTab === 'general'"
          aria-controls="expense-panel-general"
          :class="{ 'is-active': activeExpenseTab === 'general' }"
          @click="activeExpenseTab = 'general'"
        >
          Général
        </button>
        <button
          id="expense-tab-details"
          type="button"
          role="tab"
          :aria-selected="activeExpenseTab === 'details'"
          aria-controls="expense-panel-details"
          :class="{ 'is-active': activeExpenseTab === 'details' }"
          @click="activeExpenseTab = 'details'"
        >
          Détails
        </button>
      </div>

      <div
        v-if="activeExpenseTab === 'general'"
        id="expense-panel-general"
        role="tabpanel"
        aria-labelledby="expense-tab-general"
        class="client-mobile-expenses__panel"
      >
        <div class="client-mobile-expenses__summary">
          <span>Total validé · {{ totalPeriodLabel }}</span>
          <strong>{{ formatGnf(totalValidatedExpenses) }}</strong>
          <small>{{ validatedExpenses.length }} {{ validatedExpenses.length > 1 ? "dépenses validées" : "dépense validée" }}</small>
        </div>

        <section v-if="expenseComparison.length" class="client-mobile-expenses__chart" aria-labelledby="expense-comparison-title">
          <div class="client-mobile-expenses__chart-heading">
            <h2 id="expense-comparison-title">Comparaison par véhicule</h2>
            <span>Dépenses validées</span>
          </div>
          <div class="client-mobile-expenses__chart-rows">
            <div v-for="vehicle in expenseComparison" :key="vehicle.registration" class="client-mobile-expenses__chart-row">
              <div>
                <strong>{{ vehicle.name }}</strong>
                <span>{{ formatGnf(vehicle.total) }}</span>
              </div>
              <div
                class="client-mobile-expenses__chart-track"
                role="progressbar"
                :aria-label="`${vehicle.name}, ${formatGnf(vehicle.total)}`"
                aria-valuemin="0"
                :aria-valuemax="expenseComparisonMax"
                :aria-valuenow="vehicle.total"
              >
                <span :style="{ width: `${vehicle.percentage}%` }" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div
        v-else
        id="expense-panel-details"
        role="tabpanel"
        aria-labelledby="expense-tab-details"
        class="client-mobile-expenses__panel"
      >
        <div class="client-mobile-expenses__heading">
          <h2>Toutes les dépenses</h2>
          <span>{{ isLoading ? "…" : searchedExpenses.length }}</span>
        </div>

        <div class="client-mobile-deliveries__toolbar is-search-only client-mobile-expenses__search">
          <label class="client-mobile-deliveries__search">
            <i class="pi pi-search" aria-hidden="true" />
            <span class="sr-only">Rechercher une dépense</span>
            <input v-model="search" type="search" inputmode="search" placeholder="Type, motif ou véhicule" autocomplete="off">
            <button v-if="search" type="button" aria-label="Effacer la recherche" @click="search = ''">
              <i class="pi pi-times" aria-hidden="true" />
            </button>
          </label>
        </div>

        <div v-if="monthGroups.length" class="client-mobile-expenses__months">
          <section v-for="group in monthGroups" :key="group.key" class="client-mobile-expenses__month">
            <button
              type="button"
              class="client-mobile-expenses__month-toggle"
              :aria-expanded="!collapsedMonths.has(group.key)"
              :aria-controls="`expense-month-${group.key}`"
              @click="toggleMonth(group.key)"
            >
              <span>
                <strong>{{ group.label }}</strong>
                <small>{{ expenseCountLabel(group.expenses.length) }} · Validé : {{ formatGnf(group.validatedTotal) }}</small>
              </span>
              <i :class="['pi', collapsedMonths.has(group.key) ? 'pi-chevron-right' : 'pi-chevron-down']" aria-hidden="true" />
            </button>

            <div v-show="!collapsedMonths.has(group.key)" :id="`expense-month-${group.key}`" class="client-mobile-expenses__list">
              <article v-for="expense in group.expenses" :key="expense.id" class="client-mobile-expenses__card">
                <span class="client-mobile-expenses__icon" aria-hidden="true"><i :class="expenseIcon(expense.type_code)" /></span>
                <div class="client-mobile-expenses__content">
                  <div class="client-mobile-expenses__card-top">
                    <strong>{{ expense.type_label }}</strong>
                    <span :class="`is-${expense.statut}`">{{ expense.statut_label }}</span>
                  </div>
                  <span v-if="expense.vehicule">{{ expense.vehicule.nom_vehicule }} · {{ expense.vehicule.immatriculation }}</span>
                  <span v-else>Dépense personnelle</span>
                  <small>{{ formatDate(expense.date) }}</small>
                </div>
                <strong class="client-mobile-expenses__amount">{{ formatGnf(expense.montant) }}</strong>
              </article>
            </div>
          </section>
        </div>

        <div v-else-if="search || activeFilters.length" class="client-mobile-expenses__empty" role="status">
          <i class="pi pi-filter-slash" aria-hidden="true" />
          <strong>Aucune dépense ne correspond</strong>
          <span>Modifiez votre recherche ou vos filtres.</span>
          <Button label="Réinitialiser" severity="secondary" outlined size="small" @click="resetAllFilters" />
        </div>

        <div v-else-if="!periodeVide" class="client-mobile-expenses__empty" role="status">
          <i class="pi pi-wallet" aria-hidden="true" />
          <strong>Aucune dépense trouvée</strong>
          <span>Les dépenses apparaîtront ici après validation par le back-office.</span>
        </div>
      </div>
    </template>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div class="col-span-12">
      <ClientPeriodeComptableFilter
        class="!mb-0"
        :model-value="periodeComptable"
        :actif="periodeComptableActive"
        :chargement="isLoading"
        :debut="response?.filters.date_debut"
        :fin="response?.filters.date_fin"
        @update:model-value="choisirPeriodeComptable"
      />
    </div>
    <div v-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="isLoading && !hasLoaded" class="col-span-12"><div class="card text-muted-color" role="status">Chargement des dépenses…</div></div>

    <template v-else>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Total validé · {{ totalPeriodLabel }}</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatGnf(totalValidatedExpenses) }}</div><span class="text-muted-color">Dépenses validées</span></div></div>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Dépenses affichées</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ expenses.length }}</div><span class="text-muted-color">{{ meta ? `sur ${meta.total} au total` : "—" }}</span></div></div>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Accès</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">Consultation</div><span class="text-muted-color">Aucune modification autorisée</span></div></div>

      <div class="col-span-12">
        <div class="card">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div><div class="font-semibold text-xl">Mes dépenses</div><p class="text-muted-color mt-2 mb-0">Filtrez par statut ou par véhicule.</p></div>
            <div class="flex gap-2 w-full sm:w-auto">
              <Select v-model="appliedFilters.statut" :options="statutOptions" option-label="label" option-value="value" class="w-full sm:w-52" />
              <Select v-model="appliedFilters.vehiculeId" :options="vehiculeOptions" option-label="label" option-value="value" class="w-full sm:w-56" />
            </div>
          </div>
          <p v-if="hasMoreThanShown" class="text-muted-color text-sm mb-4">
            Affichage limité aux {{ meta!.per_page }} dépenses les plus récentes sur {{ meta!.total }} — affinez avec les filtres pour voir les autres.
          </p>
          <DataTable :value="expenses" data-key="id" responsive-layout="scroll" striped-rows paginator :rows="10">
            <Column header="Dépense"><template #body="{ data }"><div class="flex items-center gap-3"><div class="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-full"><i :class="expenseIcon(data.type_code)" class="text-green-500" /></div><span class="font-medium">{{ data.type_label }}</span></div></template></Column>
            <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} · ${data.vehicule.immatriculation}` : "Dépense personnelle" }}</template></Column>
            <Column header="Date"><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
            <Column header="Montant"><template #body="{ data }">{{ formatGnf(data.montant) }}</template></Column>
            <Column header="Statut"><template #body="{ data }"><Tag :value="data.statut_label" :severity="statutSeverity(data.statut)" /></template></Column>
          </DataTable>
          <p v-if="!expenses.length" class="text-muted-color text-center py-8">
            Aucune dépense trouvée pour ces filtres.
            <Button v-if="periodeVide" class="block mx-auto mt-3" label="Voir toutes les périodes" severity="secondary" outlined size="small" @click="voirToutesLesPeriodes" />
          </p>
        </div>
      </div>
    </template>
  </div>

  <Drawer
    v-model:visible="filterPanelVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    header="Filtrer les dépenses"
    class="client-delivery-filter-drawer"
  >
    <form id="client-expense-filter-form" class="client-delivery-filter" @submit.prevent="applyFilters">
      <p>Affinez la liste avec un ou plusieurs critères.</p>
      <div class="client-delivery-filter__grid">
        <div class="client-delivery-filter__field" role="group" aria-label="Périodes rapides">
          <span>Période</span>
          <div class="client-delivery-filter__periods">
            <button
              v-for="periode in draftPeriodOptions"
              :key="periode.value"
              type="button"
              :class="{ 'is-active': draftPeriodeActive(periode.value) }"
              :aria-pressed="draftPeriodeActive(periode.value)"
              @click="choisirDraftPeriode(periode.value)"
            >
              {{ periode.label }}
            </button>
          </div>
        </div>
        <div class="client-delivery-filter__field">
          <span>Année, mois et quinzaine</span>
          <ClientPeriodeComptableFilter
            :model-value="draftComptable"
            :actif="draftFilters.period === 'comptable'"
            compact
            @update:model-value="choisirDraftComptable"
          />
        </div>
        <template v-if="draftFilters.period === 'custom'">
          <label class="client-delivery-filter__field">
            <span>Date de début</span>
            <input v-model="draftFilters.customStart" type="date" class="client-delivery-filter__date">
          </label>
          <label class="client-delivery-filter__field">
            <span>Date de fin</span>
            <input v-model="draftFilters.customEnd" type="date" class="client-delivery-filter__date">
          </label>
          <p v-if="periodError" class="m-0 text-sm text-red-500" role="alert">{{ periodError }}</p>
        </template>
        <label class="client-delivery-filter__field">
          <span>Statut</span>
          <Select v-model="draftFilters.statut" :options="statutOptions" option-label="label" option-value="value" fluid />
        </label>
        <label class="client-delivery-filter__field">
          <span>Type</span>
          <Select v-model="draftFilters.typeLabel" :options="typeOptions" option-label="label" option-value="value" fluid />
        </label>
        <label class="client-delivery-filter__field">
          <span>Véhicule</span>
          <Select v-model="draftFilters.vehiculeId" :options="vehiculeOptions" option-label="label" option-value="value" fluid />
        </label>
      </div>
    </form>
    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="resetDraftFilters" />
        <Button type="submit" form="client-expense-filter-form" label="Appliquer" />
      </div>
    </template>
  </Drawer>
  </div>
</template>
