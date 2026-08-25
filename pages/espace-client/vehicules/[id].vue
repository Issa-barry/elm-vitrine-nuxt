<script setup lang="ts">
definePageMeta({ layout: "client" });

const route = useRoute();
const activeTab = ref("commissions");
const selectedStatus = ref("Tous");
const selectedPeriod = ref("Tous les mois");

const vehicleCatalog = {
  ou3859: {
    name: "ABARRY",
    registration: "OU3859",
    status: "En activité",
    totalCommission: "2 380 000 GNF",
    paidCommission: "1 580 000 GNF",
    remainingCommission: "800 000 GNF",
    ordersCount: 48,
    expensesTotal: "385 000 GNF",
    driver: "Issa M.",
    addedAt: "12 janvier 2026",
  },
  ou4217: {
    name: "ABARRY 2",
    registration: "OU4217",
    status: "En activité",
    totalCommission: "1 950 000 GNF",
    paidCommission: "1 200 000 GNF",
    remainingCommission: "750 000 GNF",
    ordersCount: 37,
    expensesTotal: "290 000 GNF",
    driver: "Mamadou D.",
    addedAt: "3 mars 2026",
  },
  ou7712: {
    name: "ABARRY 3",
    registration: "OU7712",
    status: "En entretien",
    totalCommission: "1 420 000 GNF",
    paidCommission: "920 000 GNF",
    remainingCommission: "500 000 GNF",
    ordersCount: 29,
    expensesTotal: "440 000 GNF",
    driver: "Amine B.",
    addedAt: "18 avril 2026",
  },
} as const;

const vehicleId = computed(() => String(route.params.id || "").toLowerCase() as keyof typeof vehicleCatalog);
const vehicle = computed(() => vehicleCatalog[vehicleId.value] ?? vehicleCatalog.ou3859);

useHead(() => ({ title: `${vehicle.value.name} — Eau La Maman` }));

const statusOptions = ["Tous", "Payée", "Partielle", "En attente"];
const periodOptions = ["Tous les mois", "Août 2026", "Juillet 2026", "Juin 2026"];

const commissions = [
  { order: "CMD-2847", date: "23 août 2026", amount: "180 000 GNF", status: "En attente" },
  { order: "CMD-2841", date: "22 août 2026", amount: "145 000 GNF", status: "Payée" },
  { order: "CMD-2839", date: "20 août 2026", amount: "210 000 GNF", status: "Payée" },
  { order: "CMD-2832", date: "18 août 2026", amount: "165 000 GNF", status: "Partielle" },
];

const expenses = [
  { label: "Carburant", date: "22 août 2026", amount: "85 000 GNF", status: "Validée" },
  { label: "Entretien", date: "16 août 2026", amount: "250 000 GNF", status: "Validée" },
  { label: "Lavage", date: "9 août 2026", amount: "50 000 GNF", status: "En attente" },
];

const filteredCommissions = computed(() => {
  if (selectedStatus.value === "Tous") return commissions;
  return commissions.filter((commission) => commission.status === selectedStatus.value);
});

const commissionSeverity = (status: string) => {
  if (status === "Payée") return "success";
  if (status === "Partielle") return "info";
  return "warn";
};
</script>

<template>
  <div class="mx-auto max-w-6xl">
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
          <Tab value="commissions">Commissions</Tab>
          <Tab value="expenses">Dépenses</Tab>
          <Tab value="details">Caractéristiques</Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="commissions">
            <div class="rounded-border bg-primary text-primary-contrast p-5 md:p-6 mb-6">
              <div class="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div class="font-semibold text-xl">{{ vehicle.name }}</div>
                  <div class="mt-2 opacity-80">{{ vehicle.registration }}</div>
                </div>
                <Tag :value="vehicle.status" :severity="vehicle.status === 'En activité' ? 'success' : 'warn'" />
              </div>
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div><span class="block text-sm opacity-75 mb-1">Total généré</span><strong class="text-lg">{{ vehicle.totalCommission }}</strong></div>
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
                  <span class="block text-muted-color font-medium mb-2">Dépenses cumulées</span>
                  <strong class="text-surface-900 dark:text-surface-0 text-2xl">{{ vehicle.expensesTotal }}</strong>
                </div>
              </div>
              <div class="col-span-12 md:col-span-6">
                <div class="rounded-border bg-green-100 dark:bg-green-400/10 p-5">
                  <span class="block text-muted-color font-medium mb-2">Solde après dépenses</span>
                  <strong class="text-surface-900 dark:text-surface-0 text-2xl">1 995 000 GNF</strong>
                </div>
              </div>
            </div>
            <DataTable :value="expenses" responsive-layout="scroll" striped-rows>
              <Column field="label" header="Dépense" />
              <Column field="date" header="Date" />
              <Column field="amount" header="Montant" />
              <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="data.status === 'Validée' ? 'success' : 'warn'" /></template></Column>
            </DataTable>
          </TabPanel>

          <TabPanel value="details">
            <div class="grid grid-cols-12 gap-6">
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Nom du véhicule</span><strong class="text-lg">{{ vehicle.name }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Immatriculation</span><strong class="text-lg">{{ vehicle.registration }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Statut</span><Tag :value="vehicle.status" :severity="vehicle.status === 'En activité' ? 'success' : 'warn'" /></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Conducteur actuel</span><strong class="text-lg">{{ vehicle.driver }}</strong></div></div>
              <div class="col-span-12 md:col-span-6"><div class="rounded-border bg-surface-50 dark:bg-surface-800 p-5"><span class="block text-muted-color text-sm mb-2">Ajouté le</span><strong class="text-lg">{{ vehicle.addedAt }}</strong></div></div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
