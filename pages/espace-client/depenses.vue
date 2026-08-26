<script setup lang="ts">
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Dépenses de mes véhicules — Eau La Maman" });

type ExpenseStatus = "valide" | "soumis";

const expenses = [
  { id: "DEP-0385", label: "Carburant", vehicleName: "ABARRY", registration: "OU3859", date: "2026-08-22", amount: 68_400, icon: "pi pi-bolt", status: "valide" as ExpenseStatus },
  { id: "DEP-0378", label: "Péage", vehicleName: "ABARRY 2", registration: "OU4217", date: "2026-08-21", amount: 12_700, icon: "pi pi-ticket", status: "valide" as ExpenseStatus },
  { id: "DEP-0372", label: "Entretien périodique", vehicleName: "ABARRY 3", registration: "OU7712", date: "2026-08-20", amount: 284_000, icon: "pi pi-wrench", status: "soumis" as ExpenseStatus },
  { id: "DEP-0364", label: "Carburant", vehicleName: "ABARRY 2", registration: "OU4217", date: "2026-08-18", amount: 74_300, icon: "pi pi-bolt", status: "valide" as ExpenseStatus },
];

const activeExpenseTab = ref<"general" | "details">("general");
const validatedExpenses = computed(() => expenses.filter((expense) => expense.status === "valide"));

const formatAmount = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;
const formatDate = (date: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

const statusLabel = (status: ExpenseStatus) => status === "valide" ? "Validée" : "Soumise";
const statusSeverity = (status: ExpenseStatus): "success" | "warn" => status === "valide" ? "success" : "warn";
const totalValidatedExpenses = computed(() => validatedExpenses.value.reduce((sum, expense) => sum + expense.amount, 0));
const expenseComparison = computed(() => {
  const vehicles = Array.from(new Map(expenses.map((expense) => [
    expense.registration,
    { name: expense.vehicleName, registration: expense.registration },
  ])).values());

  const totals = vehicles.map((vehicle) => ({
    ...vehicle,
    total: validatedExpenses.value
      .filter((expense) => expense.registration === vehicle.registration)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const largestTotal = Math.max(...totals.map((vehicle) => vehicle.total), 1);

  return totals.map((vehicle) => ({
    ...vehicle,
    percentage: Math.round((vehicle.total / largestTotal) * 100),
  }));
});
const expenseComparisonMax = computed(() => Math.max(...expenseComparison.value.map((vehicle) => vehicle.total), 1));
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-expenses-title">
    <ClientMobilePageTopbar
      title="Dépenses"
      title-id="mobile-expenses-title"
    />

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
        <strong>{{ formatAmount(totalValidatedExpenses) }}</strong>
        <small>{{ validatedExpenses.length }} dépenses validées pour vos véhicules</small>
      </div>

      <section class="client-mobile-expenses__chart" aria-labelledby="expense-comparison-title">
        <div class="client-mobile-expenses__chart-heading">
          <h2 id="expense-comparison-title">Comparaison par véhicule</h2>
          <span>Dépenses validées</span>
        </div>
        <div class="client-mobile-expenses__chart-rows">
          <div v-for="vehicle in expenseComparison" :key="vehicle.registration" class="client-mobile-expenses__chart-row">
            <div>
              <strong>{{ vehicle.name }}</strong>
              <span>{{ formatAmount(vehicle.total) }}</span>
            </div>
            <div
              class="client-mobile-expenses__chart-track"
              role="progressbar"
              :aria-label="`${vehicle.name}, ${formatAmount(vehicle.total)}`"
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
        <h2>Dépenses validées</h2>
        <span>{{ validatedExpenses.length }}</span>
      </div>

      <div v-if="validatedExpenses.length" class="client-mobile-expenses__list">
        <article v-for="expense in validatedExpenses" :key="expense.id" class="client-mobile-expenses__card">
          <span class="client-mobile-expenses__icon" aria-hidden="true"><i :class="expense.icon" /></span>
          <div class="client-mobile-expenses__content">
            <div class="client-mobile-expenses__card-top">
              <strong>{{ expense.label }}</strong>
              <span :class="`is-${expense.status}`">{{ statusLabel(expense.status) }}</span>
            </div>
            <span>{{ expense.vehicleName }} · {{ expense.registration }}</span>
            <small>{{ formatDate(expense.date) }}</small>
          </div>
          <strong class="client-mobile-expenses__amount">{{ formatAmount(expense.amount) }}</strong>
        </article>
      </div>

      <div v-else class="client-mobile-expenses__empty" role="status">
        <i class="pi pi-wallet" aria-hidden="true" />
        <strong>Aucune dépense trouvée</strong>
        <span>Les dépenses apparaîtront ici après validation par le back-office.</span>
      </div>
    </div>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Total validé</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatAmount(totalValidatedExpenses) }}</div><span class="text-muted-color">Dépenses de vos véhicules</span></div></div>
    <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Dépenses visibles</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ validatedExpenses.length }}</div><span class="text-muted-color">Validées par le back-office</span></div></div>
    <div class="col-span-12 lg:col-span-4"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Accès</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">Consultation</div><span class="text-muted-color">Aucune modification autorisée</span></div></div>

    <div class="col-span-12">
      <div class="card">
        <div class="mb-4"><div class="font-semibold text-xl">Dépenses validées de mes véhicules</div><p class="text-muted-color mt-2 mb-0">Seules les dépenses validées par le back-office sont affichées.</p></div>
        <DataTable :value="validatedExpenses" data-key="id" responsive-layout="scroll" striped-rows>
          <Column header="Dépense"><template #body="{ data }"><div class="flex items-center gap-3"><div class="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-full"><i :class="data.icon" class="text-green-500" /></div><span class="font-medium">{{ data.label }}</span></div></template></Column>
          <Column header="Véhicule"><template #body="{ data }">{{ data.vehicleName }} · {{ data.registration }}</template></Column>
          <Column header="Date"><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
          <Column header="Montant"><template #body="{ data }">{{ formatAmount(data.amount) }}</template></Column>
          <Column header="Statut"><template #body="{ data }"><Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" /></template></Column>
        </DataTable>
      </div>
    </div>
  </div>
  </div>

</template>
