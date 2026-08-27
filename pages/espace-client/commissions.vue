<script setup lang="ts">
import type { CommissionStatus } from "~/config/clientCommissions";
import { COMMISSION_STATUS_LABELS } from "~/config/clientCommissions";

definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Mes commissions — Eau La Maman" });

const { commissions, isLoading, error, hasLoaded, fetchCommissions } = useClientCommissions();
const { vehicles: ownedVehicles } = useClientVehicles();
const route = useRoute();

onMounted(() => {
  fetchCommissions();
});

// "tous" plutôt que "" comme valeur du filtre par défaut : PrimeVue Select
// affiche son placeholder (jamais défini ici) tant que la modelValue est
// vide ("", null, undefined), même quand une option `{ value: "" }` existe
// déjà dans la liste — d'où ce sentinel non vide (voir même correctif sur
// pages/espace-client/depenses.vue).
const ALL = "tous";
const statutFilter = ref<CommissionStatus | typeof ALL>(ALL);
// Pré-rempli depuis ?vehicule_id=... (voir pages/espace-client/index.vue,
// carte "Solde par véhicule" — cliquer une ligne arrive ici déjà filtré sur
// ce véhicule, plutôt que d'atterrir sur une liste non filtrée qu'il faudrait
// re-filtrer soi-même).
const vehiculeFilter = ref<string>(typeof route.query.vehicule_id === "string" ? route.query.vehicule_id : ALL);

const statutOptions: Array<{ label: string; value: CommissionStatus | typeof ALL }> = [
  { label: "Tous les statuts", value: ALL },
  { label: COMMISSION_STATUS_LABELS.paye, value: "paye" },
  { label: COMMISSION_STATUS_LABELS.partiel, value: "partiel" },
  { label: COMMISSION_STATUS_LABELS.en_attente, value: "en_attente" },
];
const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: ALL },
  ...ownedVehicles.value.map((vehicle) => ({ label: `${vehicle.nom} · ${vehicle.immatriculation}`, value: vehicle.id })),
]);

const filteredCommissions = computed(() => commissions.value.filter((commission) =>
  (statutFilter.value === ALL || commission.statut === statutFilter.value)
  && (vehiculeFilter.value === ALL || commission.vehicule.id === vehiculeFilter.value),
));

// Totaux affichés = somme des montants déjà renvoyés par le backend pour les
// lignes visibles (jamais un nouveau calcul métier, juste une addition
// d'affichage — voir demande du 26/08/2026, section 30).
const totals = computed(() => filteredCommissions.value.reduce(
  (acc, c) => ({
    net: acc.net + c.montant_net,
    aPayer: acc.aPayer + c.montant_a_payer,
    verse: acc.verse + c.montant_verse,
    restant: acc.restant + c.montant_restant,
  }),
  { net: 0, aPayer: 0, verse: 0, restant: 0 },
));

const statutSeverity = (statut: CommissionStatus): "success" | "warn" | "info" =>
  statut === "paye" ? "success" : statut === "partiel" ? "warn" : "info";

const formatDate = (iso: string | null) => iso
  ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
  : "—";
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-commissions-title">
    <ClientMobilePageTopbar title="Commissions" title-id="mobile-commissions-title" />

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="isLoading && !hasLoaded" class="p-4 text-muted-color" role="status">Chargement des commissions…</div>

    <template v-else>
      <div class="client-mobile-expenses__summary">
        <span>Reste à payer</span>
        <strong>{{ formatGnf(totals.restant) }}</strong>
        <small>{{ filteredCommissions.length }} commission{{ filteredCommissions.length > 1 ? "s" : "" }}</small>
      </div>

      <div v-if="filteredCommissions.length" class="client-mobile-expenses__list">
        <article v-for="commission in filteredCommissions" :key="commission.id" class="client-mobile-expenses__card">
          <span class="client-mobile-expenses__icon" aria-hidden="true"><i class="pi pi-percentage" /></span>
          <div class="client-mobile-expenses__content">
            <div class="client-mobile-expenses__card-top">
              <strong>{{ commission.reference }}</strong>
              <span :class="`is-${commission.statut === 'paye' ? 'valide' : commission.statut === 'partiel' ? 'soumis' : 'rejete'}`">
                {{ COMMISSION_STATUS_LABELS[commission.statut] }}
              </span>
            </div>
            <span>{{ commission.vehicule.nom }} · {{ commission.vehicule.immatriculation }}</span>
            <small>{{ commission.mois }}</small>
          </div>
          <strong class="client-mobile-expenses__amount">{{ formatGnf(commission.montant_restant) }}</strong>
        </article>
      </div>

      <div v-else class="client-mobile-expenses__empty" role="status">
        <i class="pi pi-percentage" aria-hidden="true" />
        <strong>Aucune commission trouvée</strong>
        <span>Les commissions apparaîtront ici après validation de vos ventes.</span>
      </div>
    </template>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div v-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="isLoading && !hasLoaded" class="col-span-12"><div class="card text-muted-color" role="status">Chargement des commissions…</div></div>

    <template v-else>
      <div class="col-span-12 lg:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Montant net</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatGnf(totals.net) }}</div></div></div>
      <div class="col-span-12 lg:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Déjà versé</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatGnf(totals.verse) }}</div></div></div>
      <div class="col-span-12 lg:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Reste à payer</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatGnf(totals.restant) }}</div></div></div>
      <div class="col-span-12 lg:col-span-3"><div class="card !mb-0"><span class="block text-muted-color font-medium mb-4">Commissions</span><div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ filteredCommissions.length }}</div></div></div>

      <div class="col-span-12">
        <div class="card">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div><div class="font-semibold text-xl">Mes commissions</div><p class="text-muted-color mt-2 mb-0">Filtrez par statut ou par véhicule.</p></div>
            <div class="flex gap-2 w-full sm:w-auto">
              <Select v-model="statutFilter" :options="statutOptions" option-label="label" option-value="value" class="w-full sm:w-52" />
              <Select v-model="vehiculeFilter" :options="vehiculeOptions" option-label="label" option-value="value" class="w-full sm:w-56" />
            </div>
          </div>
          <DataTable :value="filteredCommissions" data-key="id" responsive-layout="scroll" striped-rows paginator :rows="10">
            <Column field="reference" header="Référence" sortable />
            <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule.nom }} · {{ data.vehicule.immatriculation }}</template></Column>
            <Column header="Mois" field="mois" />
            <Column header="Date" field="date" sortable><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
            <Column header="Net"><template #body="{ data }">{{ formatGnf(data.montant_net) }}</template></Column>
            <Column header="À payer"><template #body="{ data }">{{ formatGnf(data.montant_a_payer) }}</template></Column>
            <Column header="Versé"><template #body="{ data }">{{ formatGnf(data.montant_verse) }}</template></Column>
            <Column header="Restant"><template #body="{ data }">{{ formatGnf(data.montant_restant) }}</template></Column>
            <Column header="Statut"><template #body="{ data }"><Tag :value="COMMISSION_STATUS_LABELS[data.statut as CommissionStatus]" :severity="statutSeverity(data.statut)" /></template></Column>
          </DataTable>
          <p v-if="!filteredCommissions.length" class="text-muted-color text-center py-8">Aucune commission trouvée pour ces filtres.</p>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>
