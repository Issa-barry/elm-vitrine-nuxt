<script setup lang="ts">
definePageMeta({ layout: "client" });

const route = useRoute();
const activeTab = ref("gains");
const vehicleHistoryFilterVisible = ref(false);
const selectedStatus = ref("Tous");
const selectedPeriod = ref("Tous les mois");
const selectedExpensePeriod = ref("Tous les mois");

type ExpenseStatus = "brouillon" | "soumis" | "valide" | "rejete" | "annule";

type VehicleExpense = {
  id: string;
  date: string;
  amount: number;
  typeCode: string;
  typeLabel: string;
  status: ExpenseStatus;
  comment?: string;
};

const vehicleCatalog = {
  ou3859: {
    name: "ABARRY",
    registration: "OU3859",
    type: "Camion",
    capacityPacks: 500,
    status: "En activité",
    totalCommission: "2 380 000 GNF",
    paidCommission: "1 580 000 GNF",
    remainingCommission: "800 000 GNF",
    ordersCount: 48,
    driver: "Issa M.",
    addedAt: "12 janvier 2026",
  },
  ou4217: {
    name: "ABARRY 2",
    registration: "OU4217",
    type: "Minibus",
    capacityPacks: 150,
    status: "En activité",
    totalCommission: "1 950 000 GNF",
    paidCommission: "1 200 000 GNF",
    remainingCommission: "750 000 GNF",
    ordersCount: 37,
    driver: "Mamadou D.",
    addedAt: "3 mars 2026",
  },
  ou7712: {
    name: "ABARRY 3",
    registration: "OU7712",
    type: "Tricycle",
    capacityPacks: 80,
    status: "En entretien",
    totalCommission: "1 420 000 GNF",
    paidCommission: "920 000 GNF",
    remainingCommission: "500 000 GNF",
    ordersCount: 29,
    driver: "Amine B.",
    addedAt: "18 avril 2026",
  },
} as const;

const vehicleId = computed(() => String(route.params.id || "").toLowerCase() as keyof typeof vehicleCatalog);
const vehicle = computed(() => vehicleCatalog[vehicleId.value] ?? vehicleCatalog.ou3859);
const formattedCapacity = computed(() => `${new Intl.NumberFormat("fr-FR").format(vehicle.value.capacityPacks)} packs`);

useHead(() => ({ title: `${vehicle.value.name} — Eau La Maman` }));

const statusOptions = ["Tous", "Payée", "Partielle", "En attente"];
const periodOptions = ["Tous les mois", "Août 2026", "Juillet 2026", "Juin 2026"];

const commissions = [
  { order: "CMD-2847", date: "23 août 2026", period: "Août 2026", amount: "180 000 GNF", status: "En attente" },
  { order: "CMD-2841", date: "22 août 2026", period: "Août 2026", amount: "145 000 GNF", status: "Payée" },
  { order: "CMD-2839", date: "20 juillet 2026", period: "Juillet 2026", amount: "210 000 GNF", status: "Payée" },
  { order: "CMD-2832", date: "18 juin 2026", period: "Juin 2026", amount: "165 000 GNF", status: "Partielle" },
];

const expensesByVehicle: Record<keyof typeof vehicleCatalog, VehicleExpense[]> = {
  ou3859: [
    { id: "DEP-0385", date: "2026-08-22", amount: 85_000, typeCode: "carburant", typeLabel: "Carburant", status: "valide", comment: "Plein du véhicule" },
    { id: "DEP-0372", date: "2026-08-16", amount: 250_000, typeCode: "entretien", typeLabel: "Entretien", status: "valide", comment: "Révision générale" },
    { id: "DEP-0348", date: "2026-07-09", amount: 50_000, typeCode: "lavage", typeLabel: "Lavage", status: "soumis" },
  ],
  ou4217: [
    { id: "DEP-0361", date: "2026-08-19", amount: 120_000, typeCode: "carburant", typeLabel: "Carburant", status: "valide" },
    { id: "DEP-0329", date: "2026-07-28", amount: 120_000, typeCode: "entretien", typeLabel: "Révision", status: "valide" },
    { id: "DEP-0314", date: "2026-07-12", amount: 50_000, typeCode: "assurance", typeLabel: "Assurance", status: "soumis" },
  ],
  ou7712: [
    { id: "DEP-0394", date: "2026-08-23", amount: 300_000, typeCode: "reparation", typeLabel: "Réparation", status: "soumis", comment: "Immobilisation en atelier" },
    { id: "DEP-0379", date: "2026-08-17", amount: 90_000, typeCode: "pieces", typeLabel: "Pièces détachées", status: "valide" },
    { id: "DEP-0355", date: "2026-07-30", amount: 50_000, typeCode: "carburant", typeLabel: "Carburant", status: "annule" },
  ],
};

const filteredCommissions = computed(() => {
  return commissions.filter((commission) => {
    const matchesStatus = selectedStatus.value === "Tous" || commission.status === selectedStatus.value;
    const matchesPeriod = selectedPeriod.value === "Tous les mois" || commission.period === selectedPeriod.value;
    return matchesStatus && matchesPeriod;
  });
});

const vehicleExpenses = computed(() => expensesByVehicle[vehicleId.value] ?? expensesByVehicle.ou3859);
const validatedVehicleExpenses = computed(() => vehicleExpenses.value.filter((expense) => expense.status === "valide"));

const formatExpenseMonth = (date: string) => {
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

  return label.charAt(0).toLocaleUpperCase("fr") + label.slice(1);
};

const formatExpenseDate = (date: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

const formatAmount = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} GNF`;

const expensePeriodOptions = computed(() => [
  "Tous les mois",
  ...Array.from(new Set(validatedVehicleExpenses.value.map((expense) => formatExpenseMonth(expense.date)))),
]);

const filteredExpenses = computed(() => validatedVehicleExpenses.value.filter((expense) => {
  const matchesPeriod = selectedExpensePeriod.value === "Tous les mois" || formatExpenseMonth(expense.date) === selectedExpensePeriod.value;
  return matchesPeriod;
}));

const validatedExpenseTotal = computed(() => validatedVehicleExpenses.value.reduce((sum, expense) => sum + expense.amount, 0));
const filteredExpenseTotal = computed(() => filteredExpenses.value.reduce((sum, expense) => sum + expense.amount, 0));

const groupedExpenses = computed(() => {
  const groups = new Map<string, VehicleExpense[]>();

  filteredExpenses.value.forEach((expense) => {
    const month = formatExpenseMonth(expense.date);
    groups.set(month, [...(groups.get(month) ?? []), expense]);
  });

  return Array.from(groups, ([label, items]) => ({
    label,
    items,
    total: items.reduce((sum, expense) => sum + expense.amount, 0),
  }));
});

const activeHistoryFilterLabel = computed(() => {
  if (activeTab.value === "gains") return "Filtrer les commissions";
  if (activeTab.value === "expenses") return "Filtrer les dépenses";
  return undefined;
});

const activeHistoryFilterCount = computed(() => {
  if (activeTab.value === "gains") {
    return Number(selectedStatus.value !== "Tous") + Number(selectedPeriod.value !== "Tous les mois");
  }

  if (activeTab.value === "expenses") {
    return Number(selectedExpensePeriod.value !== "Tous les mois");
  }

  return 0;
});

const openHistoryFilters = () => {
  if (activeTab.value !== "details") vehicleHistoryFilterVisible.value = true;
};

const resetHistoryFilters = () => {
  if (activeTab.value === "expenses") {
    selectedExpensePeriod.value = "Tous les mois";
    return;
  }

  selectedStatus.value = "Tous";
  selectedPeriod.value = "Tous les mois";
};

const expenseStatusLabel = (status: ExpenseStatus) => ({
  brouillon: "Brouillon",
  soumis: "Soumis",
  valide: "Validé",
  rejete: "Rejeté",
  annule: "Annulé",
})[status];

const expenseStatusClass = (status: ExpenseStatus) => ({
  "is-paid": status === "valide",
  "is-pending": status === "soumis",
  "is-draft": status === "brouillon",
  "is-rejected": status === "rejete",
  "is-cancelled": status === "annule",
});

const expenseSeverity = (status: ExpenseStatus): "success" | "info" | "warn" | "danger" | "secondary" => {
  if (status === "valide") return "success";
  if (status === "soumis") return "warn";
  if (status === "rejete") return "danger";
  return "secondary";
};

const expenseIcon = (typeCode: string) => ({
  carburant: "pi-bolt",
  entretien: "pi-wrench",
  reparation: "pi-wrench",
  lavage: "pi-sparkles",
  assurance: "pi-shield",
  pieces: "pi-cog",
})[typeCode] ?? "pi-receipt";

const commissionSeverity = (status: string) => {
  if (status === "Payée") return "success";
  if (status === "Partielle") return "info";
  return "warn";
};

const commissionStatusClass = (status: string) => ({
  "is-paid": status === "Payée",
  "is-partial": status === "Partielle",
  "is-pending": status === "En attente",
});
</script>

<template>
  <section class="client-mobile-vehicle-detail" aria-labelledby="mobile-vehicle-title">
    <ClientMobilePageTopbar
      :title="vehicle.name"
      title-id="mobile-vehicle-title"
      back-to="/espace-client/vehicules"
      back-label="Retour aux véhicules"
      :filter-label="activeHistoryFilterLabel"
      :filter-count="activeHistoryFilterCount"
      @filter="openHistoryFilters"
    />

    <div class="client-mobile-vehicle-detail__context">
      <span>{{ vehicle.type }} · {{ vehicle.registration }}</span>
      <span class="client-mobile-vehicle-detail__status" :class="{ 'is-maintenance': vehicle.status !== 'En activité' }">
        {{ vehicle.status }}
      </span>
    </div>

    <div class="client-mobile-vehicle-hero">
      <span class="client-mobile-vehicle-hero__icon" aria-hidden="true"><i class="pi pi-car" /></span>
      <div>
        <span>Total des commissions</span>
        <strong>{{ vehicle.totalCommission }}</strong>
        <small>Cumul des commissions du véhicule</small>
      </div>
    </div>

    <div class="client-mobile-vehicle-tabs" role="tablist" aria-label="Informations du véhicule">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'gains'"
        :class="{ 'is-active': activeTab === 'gains' }"
        @click="activeTab = 'gains'"
      >
        Commissions
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'expenses'"
        :class="{ 'is-active': activeTab === 'expenses' }"
        @click="activeTab = 'expenses'"
      >
        Dépenses
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'details'"
        :class="{ 'is-active': activeTab === 'details' }"
        @click="activeTab = 'details'"
      >
        Caractéristiques
      </button>
    </div>

    <div v-if="activeTab === 'gains'" class="client-mobile-vehicle-panel" role="tabpanel">
      <div class="client-mobile-vehicle-summary-grid">
        <div>
          <span>Déjà payé</span>
          <strong>{{ vehicle.paidCommission }}</strong>
        </div>
        <div>
          <span>Reste à payer</span>
          <strong>{{ vehicle.remainingCommission }}</strong>
        </div>
      </div>

      <div class="client-mobile-vehicle-section-heading">
        <h2>Historique des commissions</h2>
        <span>{{ filteredCommissions.length }} commandes</span>
      </div>

      <div class="client-mobile-vehicle-transactions">
        <article v-for="commission in filteredCommissions" :key="commission.order" class="client-mobile-vehicle-transaction">
          <span class="client-mobile-vehicle-transaction__icon is-gain" aria-hidden="true"><i class="pi pi-arrow-down-left" /></span>
          <div>
            <strong>{{ commission.order }}</strong>
            <span>{{ commission.date }}</span>
          </div>
          <div class="client-mobile-vehicle-transaction__amount">
            <strong>{{ commission.amount }}</strong>
            <span :class="commissionStatusClass(commission.status)">{{ commission.status }}</span>
          </div>
        </article>
      </div>
    </div>

    <div v-else-if="activeTab === 'expenses'" class="client-mobile-vehicle-panel" role="tabpanel">
      <div class="client-mobile-vehicle-expense-total">
        <span class="client-mobile-vehicle-transaction__icon is-expense" aria-hidden="true"><i class="pi pi-wallet" /></span>
        <div>
          <span>Dépenses validées</span>
          <strong>{{ formatAmount(validatedExpenseTotal) }}</strong>
          <small>{{ filteredExpenses.length }} dépense{{ filteredExpenses.length > 1 ? "s" : "" }} validée{{ filteredExpenses.length > 1 ? "s" : "" }}</small>
        </div>
      </div>

      <div v-if="groupedExpenses.length" class="client-mobile-vehicle-expense-groups">
        <section v-for="group in groupedExpenses" :key="group.label" class="client-mobile-vehicle-expense-group">
          <div class="client-mobile-vehicle-section-heading">
            <h2>{{ group.label }}</h2>
            <span>{{ formatAmount(group.total) }}</span>
          </div>

          <div class="client-mobile-vehicle-transactions">
            <article v-for="expense in group.items" :key="expense.id" class="client-mobile-vehicle-transaction">
              <span class="client-mobile-vehicle-transaction__icon is-expense" aria-hidden="true">
                <i :class="['pi', expenseIcon(expense.typeCode)]" />
              </span>
              <div>
                <strong>{{ expense.typeLabel }}</strong>
                <span>{{ formatExpenseDate(expense.date) }}</span>
              </div>
              <div class="client-mobile-vehicle-transaction__amount">
                <strong>{{ formatAmount(expense.amount) }}</strong>
                <span :class="expenseStatusClass(expense.status)">{{ expenseStatusLabel(expense.status) }}</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <div v-else class="client-mobile-vehicle-history-empty" role="status">
        <span aria-hidden="true"><i class="pi pi-receipt" /></span>
        <strong>Aucune dépense validée</strong>
        <p>Aucune dépense validée n’est disponible pour cette période.</p>
        <button type="button" @click="resetHistoryFilters">Réinitialiser</button>
      </div>
    </div>

    <div v-else class="client-mobile-vehicle-panel" role="tabpanel">
      <dl class="client-mobile-vehicle-specs">
        <div><dt>Nom du véhicule</dt><dd>{{ vehicle.name }}</dd></div>
        <div><dt>Immatriculation</dt><dd>{{ vehicle.registration }}</dd></div>
        <div><dt>Type de véhicule</dt><dd>{{ vehicle.type }}</dd></div>
        <div><dt>Capacité</dt><dd>{{ formattedCapacity }}</dd></div>
        <div><dt>Conducteur actuel</dt><dd>{{ vehicle.driver }}</dd></div>
        <div><dt>Statut</dt><dd>{{ vehicle.status }}</dd></div>
        <div><dt>Ajouté le</dt><dd>{{ vehicle.addedAt }}</dd></div>
      </dl>
    </div>
  </section>

  <div class="mx-auto max-w-6xl client-desktop-vehicle-detail">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/espace-client/vehicules" aria-label="Retour aux véhicules">
        <Button icon="pi pi-arrow-left" text rounded severity="secondary" />
      </NuxtLink>
      <div class="min-w-0">
        <div class="font-semibold text-2xl text-surface-900 dark:text-surface-0 truncate">{{ vehicle.name }}</div>
        <span class="text-muted-color">Détail du véhicule</span>
      </div>
    </div>

    <div class="card !p-0 overflow-hidden">
      <Tabs v-model:value="activeTab" scrollable>
        <TabList>
          <Tab value="gains">Commissions</Tab>
          <Tab value="expenses">Dépenses</Tab>
          <Tab value="details">Caractéristiques</Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="gains">
            <div class="rounded-border bg-primary text-primary-contrast p-5 md:p-6 mb-6">
              <div class="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div class="font-semibold text-xl">{{ vehicle.name }}</div>
                  <div class="mt-2 opacity-80">{{ vehicle.registration }}</div>
                </div>
                <Tag :value="vehicle.status" :severity="vehicle.status === 'En activité' ? 'success' : 'warn'" />
              </div>
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div><span class="block text-sm opacity-75 mb-1">Total des commissions</span><strong class="text-lg">{{ vehicle.totalCommission }}</strong></div>
                <div><span class="block text-sm opacity-75 mb-1">Déjà payé</span><strong class="text-lg">{{ vehicle.paidCommission }}</strong></div>
                <div><span class="block text-sm opacity-75 mb-1">Reste à payer</span><strong class="text-lg">{{ vehicle.remainingCommission }}</strong></div>
                <div><span class="block text-sm opacity-75 mb-1">Commandes</span><strong class="text-lg">{{ vehicle.ordersCount }}</strong></div>
              </div>
            </div>

            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
              <div class="overflow-x-auto pb-1">
                <SelectButton v-model="selectedStatus" :options="statusOptions" :allow-empty="false" />
              </div>
              <Select v-model="selectedPeriod" :options="periodOptions" class="w-full lg:w-48" />
            </div>

            <DataTable :value="filteredCommissions" data-key="order" responsive-layout="scroll" striped-rows>
              <Column field="order" header="Commande" />
              <Column field="date" header="Date" />
              <Column field="amount" header="Commission" />
              <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="commissionSeverity(data.status)" /></template></Column>
              <template #empty><div class="text-center text-muted-color py-8">Aucune commission pour ce filtre</div></template>
            </DataTable>
          </TabPanel>

          <TabPanel value="expenses">
            <div class="grid grid-cols-12 gap-6 mb-6">
              <div class="col-span-12 md:col-span-6">
                <div class="rounded-border bg-orange-100 dark:bg-orange-400/10 p-5">
                  <span class="block text-muted-color font-medium mb-2">Dépenses validées</span>
                  <strong class="text-surface-900 dark:text-surface-0 text-2xl">{{ formatAmount(validatedExpenseTotal) }}</strong>
                </div>
              </div>
              <div class="col-span-12 md:col-span-6">
                <div class="rounded-border bg-green-100 dark:bg-green-400/10 p-5">
                  <span class="block text-muted-color font-medium mb-2">Total affiché</span>
                  <strong class="text-surface-900 dark:text-surface-0 text-2xl">{{ formatAmount(filteredExpenseTotal) }}</strong>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end mb-5">
              <Select v-model="selectedExpensePeriod" :options="expensePeriodOptions" class="w-full lg:w-48" />
            </div>

            <DataTable :value="filteredExpenses" data-key="id" responsive-layout="scroll" striped-rows>
              <Column field="typeLabel" header="Dépense" />
              <Column header="Date"><template #body="{ data }">{{ formatExpenseDate(data.date) }}</template></Column>
              <Column header="Montant"><template #body="{ data }">{{ formatAmount(data.amount) }}</template></Column>
              <Column header="Statut"><template #body="{ data }"><Tag :value="expenseStatusLabel(data.status)" :severity="expenseSeverity(data.status)" /></template></Column>
              <template #empty><div class="text-center text-muted-color py-8">Aucune dépense validée pour cette période</div></template>
            </DataTable>
          </TabPanel>

          <TabPanel value="details">
            <div class="grid grid-cols-12 gap-6">
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Nom du véhicule</span><strong class="text-lg">{{ vehicle.name }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Immatriculation</span><strong class="text-lg">{{ vehicle.registration }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Type de véhicule</span><strong class="text-lg">{{ vehicle.type }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Capacité</span><strong class="text-lg">{{ formattedCapacity }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Statut</span><Tag :value="vehicle.status" :severity="vehicle.status === 'En activité' ? 'success' : 'warn'" /></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Conducteur actuel</span><strong class="text-lg">{{ vehicle.driver }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Ajouté le</span><strong class="text-lg">{{ vehicle.addedAt }}</strong></div></div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <Drawer
    v-model:visible="vehicleHistoryFilterVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    :header="activeTab === 'expenses' ? 'Filtrer les dépenses' : 'Filtrer les commissions'"
    class="client-delivery-filter-drawer"
  >
    <form id="client-vehicle-history-filter-form" class="client-delivery-filter" @submit.prevent="vehicleHistoryFilterVisible = false">
      <template v-if="activeTab === 'expenses'">
        <p>Filtrez les dépenses validées de ce véhicule par mois.</p>
        <div class="client-delivery-filter__grid">
          <label class="client-delivery-filter__field">
            <span>Période</span>
            <Select v-model="selectedExpensePeriod" :options="expensePeriodOptions" fluid />
          </label>
        </div>
      </template>

      <template v-else>
        <p>Filtrez l’historique des commissions selon le statut et la période.</p>
        <div class="client-delivery-filter__grid">
          <label class="client-delivery-filter__field">
            <span>Statut</span>
            <Select v-model="selectedStatus" :options="statusOptions" fluid />
          </label>
          <label class="client-delivery-filter__field">
            <span>Période</span>
            <Select v-model="selectedPeriod" :options="periodOptions" fluid />
          </label>
        </div>
      </template>
    </form>

    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="resetHistoryFilters" />
        <Button
          type="submit"
          form="client-vehicle-history-filter-form"
          :label="activeTab === 'expenses' ? 'Afficher les dépenses' : 'Afficher les commissions'"
        />
      </div>
    </template>
  </Drawer>
</template>
