<script setup lang="ts">
import type { ExpenseStatus } from "~/config/clientExpenses";

definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Dépenses de mes véhicules — Eau La Maman" });

const { response, isLoading, error, hasLoaded, fetchExpenses } = useClientExpenses();
const { vehicles: ownedVehicles, fetchVehicles } = useClientVehicles();

const activeExpenseTab = ref<"general" | "details">("general");
// "tous" plutôt que "" comme valeur du filtre par défaut : PrimeVue Select
// traite une modelValue vide ("", null, undefined) comme "aucune sélection"
// et affiche alors son placeholder (jamais défini ici) au lieu du libellé de
// l'option correspondante — même avec une option `{ value: "" }` déjà
// présente dans la liste, le Select restait visuellement vide. "tous" est une
// valeur non vide comme une autre, donc affichée normalement.
const ALL = "tous";
const statutFilter = ref<ExpenseStatus | typeof ALL>(ALL);
const vehiculeFilter = ref<string>(ALL);

// Plafond documenté du backend (voir docs/api-espace-client-contract.md §4,
// per_page 1-100) : un seul fetch couvre la quasi-totalité d'un usage réel
// (flotte d'une petite/moyenne organisation). meta.total (réel, jamais
// deviné) permet de signaler honnêtement le dépassement plutôt que de
// prétendre que la liste est complète — voir bandeau plus bas.
async function loadExpenses() {
  await fetchExpenses({
    per_page: 100,
    statut: statutFilter.value !== ALL ? statutFilter.value : undefined,
    vehicule_id: vehiculeFilter.value !== ALL ? vehiculeFilter.value : undefined,
  });
}

onMounted(() => {
  loadExpenses();
  fetchVehicles();
});

watch([statutFilter, vehiculeFilter], loadExpenses);

const expenses = computed(() => response.value?.data ?? []);
const meta = computed(() => response.value?.meta ?? null);
const hasMoreThanShown = computed(() => Boolean(meta.value && meta.value.total > meta.value.per_page));

// "Validées" reste le sous-ensemble affiché par défaut dans le résumé
// général (même comportement que l'ancienne maquette), calculé côté client
// UNIQUEMENT pour l'affichage à partir du lot déjà chargé — jamais un
// second calcul financier (voir demande du 26/08/2026, section 30) : ce sont
// des montants déjà fournis par le backend, seulement filtrés/sommés pour
// l'affichage, pas recalculés.
const validatedExpenses = computed(() => expenses.value.filter((expense) => expense.statut === "valide"));

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

const formatDate = (date: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

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
    <ClientMobilePageTopbar title="Dépenses" title-id="mobile-expenses-title" />

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="isLoading && !hasLoaded" class="p-4 text-muted-color" role="status">Chargement des dépenses…</div>

    <template v-else>
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
          <span>Total validé</span>
          <strong>{{ formatGnf(totalValidatedExpenses) }}</strong>
          <small>{{ validatedExpenses.length }} dépenses validées pour vos véhicules</small>
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
          <span>{{ expenses.length }}</span>
        </div>

        <div v-if="expenses.length" class="client-mobile-expenses__list">
          <article v-for="expense in expenses" :key="expense.id" class="client-mobile-expenses__card">
            <span class="client-mobile-expenses__icon" aria-hidden="true"><i :class="expenseIcon(expense.type_code)" /></span>
            <div class="client-mobile-expenses__content">
              <div class="client-mobile-expenses__card-top">
                <strong>{{ expense.type_label }}</strong>
                <span :class="`is-${expense.statut}`">{{ expense.statut_label }}</span>
              </div>
              <span v-if="expense.vehicule">{{ expense.vehicule.nom_vehicule }} · {{ expense.vehicule.immatriculation }}</span>
              <small>{{ formatDate(expense.date) }}</small>
            </div>
            <strong class="client-mobile-expenses__amount">{{ formatGnf(expense.montant) }}</strong>
          </article>
        </div>

        <div v-else class="client-mobile-expenses__empty" role="status">
          <i class="pi pi-wallet" aria-hidden="true" />
          <strong>Aucune dépense trouvée</strong>
          <span>Les dépenses apparaîtront ici après validation par le back-office.</span>
        </div>
      </div>
    </template>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div v-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="isLoading && !hasLoaded" class="col-span-12"><div class="card text-muted-color" role="status">Chargement des dépenses…</div></div>

    <template v-else>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Total validé</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatGnf(totalValidatedExpenses) }}</div><span class="text-muted-color">Dépenses de vos véhicules</span></div></div>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Dépenses affichées</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ expenses.length }}</div><span class="text-muted-color">{{ meta ? `sur ${meta.total} au total` : "—" }}</span></div></div>
      <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Accès</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">Consultation</div><span class="text-muted-color">Aucune modification autorisée</span></div></div>

      <div class="col-span-12">
        <div class="card">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div><div class="font-semibold text-xl">Dépenses de mes véhicules</div><p class="text-muted-color mt-2 mb-0">Filtrez par statut ou par véhicule.</p></div>
            <div class="flex gap-2 w-full sm:w-auto">
              <Select v-model="statutFilter" :options="statutOptions" option-label="label" option-value="value" class="w-full sm:w-52" />
              <Select v-model="vehiculeFilter" :options="vehiculeOptions" option-label="label" option-value="value" class="w-full sm:w-56" />
            </div>
          </div>
          <p v-if="hasMoreThanShown" class="text-muted-color text-sm mb-4">
            Affichage limité aux {{ meta!.per_page }} dépenses les plus récentes sur {{ meta!.total }} — affinez avec les filtres pour voir les autres.
          </p>
          <DataTable :value="expenses" data-key="id" responsive-layout="scroll" striped-rows paginator :rows="10">
            <Column header="Dépense"><template #body="{ data }"><div class="flex items-center gap-3"><div class="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-full"><i :class="expenseIcon(data.type_code)" class="text-green-500" /></div><span class="font-medium">{{ data.type_label }}</span></div></template></Column>
            <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} · ${data.vehicule.immatriculation}` : "—" }}</template></Column>
            <Column header="Date"><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
            <Column header="Montant"><template #body="{ data }">{{ formatGnf(data.montant) }}</template></Column>
            <Column header="Statut"><template #body="{ data }"><Tag :value="data.statut_label" :severity="statutSeverity(data.statut)" /></template></Column>
          </DataTable>
          <p v-if="!expenses.length" class="text-muted-color text-center py-8">Aucune dépense trouvée pour ces filtres.</p>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>
