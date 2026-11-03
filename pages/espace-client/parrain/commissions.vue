<script setup lang="ts">
import {
  formatParrainDate,
  NOT_ATTACHED_MESSAGE,
  PARRAIN_COMMISSION_STATUS_OPTIONS,
  PARRAIN_SPACE_HOME,
  type ParrainCommissionStatus,
  parrainCommissionStatusLabel,
  parrainCommissionStatusSeverity,
} from "~/config/clientParrain";

definePageMeta({ layout: "client", middleware: ["auth", "espace-parrain"] });
useHead({ title: "Mes commissions — Eau La Maman" });

const route = useRoute();
const { vehicules, commissions, commissionsResume, commissionsMeta, isLoading, error, notAttached, fetchVehicules, fetchCommissions } = useClientParrain();

const vehiculeId = ref<string | null>(typeof route.query.vehicule_id === "string" ? route.query.vehicule_id : null);
const statut = ref<ParrainCommissionStatus | null>(null);
const dateDebut = ref("");
const dateFin = ref("");
const hasLoaded = ref(false);

const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: null as string | null },
  ...vehicules.value.map((vehicule) => ({ label: `${vehicule.nom_vehicule} · ${vehicule.immatriculation}`, value: vehicule.id as string | null })),
]);

const filtres = computed(() => ({
  vehicule_id: vehiculeId.value,
  statut: statut.value,
  date_debut: dateDebut.value || null,
  date_fin: dateFin.value || null,
}));

const dateRangeInvalid = computed(() => Boolean(dateDebut.value && dateFin.value && dateFin.value < dateDebut.value));

const hasMore = computed(() => {
  const meta = commissionsMeta.value;
  return Boolean(meta && meta.current_page < meta.last_page);
});

async function reload() {
  // Le serveur répondrait 422 : le message s'affiche sous les filtres.
  if (dateRangeInvalid.value) return;
  await fetchCommissions(filtres.value);
  hasLoaded.value = true;
}

function loadMore() {
  const page = (commissionsMeta.value?.current_page ?? 1) + 1;
  return fetchCommissions({ ...filtres.value, page }, true);
}

onMounted(() => Promise.all([fetchVehicules(), reload()]));
watch(filtres, reload);

</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-parrain-commissions-title">
    <ClientMobilePageTopbar title="Mes commissions" title-id="mobile-parrain-commissions-title" :back-to="PARRAIN_SPACE_HOME" />

    <p v-if="notAttached" class="p-4 text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</p>
    <div v-else-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <p v-else-if="!hasLoaded" class="p-4 text-muted-color" role="status">Chargement des commissions…</p>

    <template v-else>
      <div class="client-mobile-expenses__summary">
        <span>Reste à payer</span>
        <strong data-testid="parrain-reste-a-payer">{{ formatGnf(commissionsResume?.reste_a_payer ?? 0) }}</strong>
        <small>Générées : {{ formatGnf(commissionsResume?.total_genere ?? 0) }} · Payées : {{ formatGnf(commissionsResume?.deja_paye ?? 0) }}</small>
        <small v-if="commissionsResume?.en_attente_periode">En attente de validation : {{ formatGnf(commissionsResume.en_attente_periode) }}</small>
      </div>

      <div class="client-parrain-filters">
        <Select v-model="vehiculeId" :options="vehiculeOptions" option-label="label" option-value="value" placeholder="Tous les véhicules" aria-label="Filtrer par véhicule" fluid />
        <Select v-model="statut" :options="PARRAIN_COMMISSION_STATUS_OPTIONS" option-label="label" option-value="value" placeholder="Tous les statuts" aria-label="Filtrer par statut" fluid />
        <label>Du<input v-model="dateDebut" type="date"></label>
        <label>Au<input v-model="dateFin" type="date"></label>
      </div>
      <p v-if="dateRangeInvalid" class="px-1 text-sm text-red-500" role="alert">La date de fin doit suivre la date de début.</p>

      <div v-if="commissions.length" class="client-mobile-expenses__list">
        <article v-for="commission in commissions" :key="commission.id" class="client-mobile-expenses__card" data-testid="parrain-commission">
          <span class="client-mobile-expenses__icon" aria-hidden="true"><i class="pi pi-percentage" /></span>
          <div class="client-mobile-expenses__content">
            <div class="client-mobile-expenses__card-top">
              <strong>{{ commission.processus_label ?? "Opération" }}</strong>
              <span :class="commission.statut === 'paye' ? 'is-valide' : 'is-soumis'">{{ parrainCommissionStatusLabel(commission.statut) }}</span>
            </div>
            <span v-if="commission.vehicule">{{ commission.vehicule.nom_vehicule }} · {{ commission.vehicule.immatriculation }}</span>
            <small>{{ formatParrainDate(commission.date) }}<template v-if="commission.reference"> · {{ commission.reference }}</template></small>
            <small v-if="commission.statut === 'partiel'">Reste : {{ formatGnf(commission.montant_restant) }}</small>
          </div>
          <strong class="client-mobile-expenses__amount">{{ formatGnf(commission.montant_a_payer) }}</strong>
        </article>
        <Button v-if="hasMore" label="Afficher plus" severity="secondary" outlined fluid :loading="isLoading" @click="loadMore" />
      </div>

      <div v-else class="client-mobile-expenses__empty" role="status">
        <i class="pi pi-percentage" aria-hidden="true" />
        <strong>Aucune commission trouvée</strong>
        <span>Modifiez vos filtres, ou revenez après vos prochaines opérations.</span>
      </div>
    </template>
  </section>

  <div class="client-desktop-expenses grid grid-cols-12 gap-8">
    <div v-if="notAttached" class="col-span-12"><div class="card text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</div></div>
    <div v-else-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="!hasLoaded" class="col-span-12"><div class="card text-muted-color" role="status">Chargement des commissions…</div></div>

    <template v-else>
      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard label="Commissions générées" :value="formatGnf(commissionsResume?.total_genere ?? 0)" no-trend />
      </div>
      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard label="Déjà payé" :value="formatGnf(commissionsResume?.deja_paye ?? 0)" no-trend />
      </div>
      <div class="col-span-12 md:col-span-4">
        <ClientDashboardKpiCard label="Reste à payer" :value="formatGnf(commissionsResume?.reste_a_payer ?? 0)" no-trend />
      </div>

      <div class="col-span-12">
        <div class="card">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-4">
            <div class="font-semibold text-xl">Mes commissions</div>
            <div class="flex flex-wrap items-center gap-2">
              <Select v-model="vehiculeId" :options="vehiculeOptions" option-label="label" option-value="value" placeholder="Tous les véhicules" aria-label="Filtrer par véhicule" class="w-full sm:w-56" />
              <Select v-model="statut" :options="PARRAIN_COMMISSION_STATUS_OPTIONS" option-label="label" option-value="value" placeholder="Tous les statuts" aria-label="Filtrer par statut" class="w-full sm:w-52" />
              <input v-model="dateDebut" type="date" aria-label="Du" class="client-parrain-date">
              <input v-model="dateFin" type="date" aria-label="Au" class="client-parrain-date">
            </div>
          </div>
          <p v-if="dateRangeInvalid" class="text-sm text-red-500" role="alert">La date de fin doit suivre la date de début.</p>
          <DataTable v-if="commissions.length" :value="commissions" data-key="id" responsive-layout="scroll" striped-rows>
            <Column header="Date"><template #body="{ data }">{{ formatParrainDate(data.date) }}</template></Column>
            <Column header="Opération"><template #body="{ data }">{{ data.processus_label ?? "—" }}<span v-if="data.reference" class="block text-muted-color text-sm">{{ data.reference }}</span></template></Column>
            <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} · ${data.vehicule.immatriculation}` : "—" }}</template></Column>
            <Column header="Montant"><template #body="{ data }">{{ formatGnf(data.montant_a_payer) }}</template></Column>
            <Column header="Payé"><template #body="{ data }">{{ formatGnf(data.montant_verse) }}</template></Column>
            <Column header="Reste"><template #body="{ data }">{{ formatGnf(data.montant_restant) }}</template></Column>
            <Column header="Statut"><template #body="{ data }"><Tag :value="parrainCommissionStatusLabel(data.statut)" :severity="parrainCommissionStatusSeverity(data.statut)" /></template></Column>
          </DataTable>
          <p v-else class="text-muted-color text-center py-8 mb-0">Aucune commission trouvée.</p>
          <div v-if="hasMore" class="flex justify-center mt-4">
            <Button label="Afficher plus" severity="secondary" outlined :loading="isLoading" @click="loadMore" />
          </div>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>

<style lang="scss" scoped>
.client-parrain-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 0.75rem 0;

  > :nth-child(-n + 2) {
    grid-column: 1 / -1;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--p-text-muted-color);
  }

  input {
    width: 100%;
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--p-content-border-radius);
    padding: 0.5rem;
  }
}

.client-parrain-date {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  padding: 0.5rem;
}
</style>
