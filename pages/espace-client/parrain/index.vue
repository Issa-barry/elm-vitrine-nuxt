<script setup lang="ts">
import { formatParrainDate, NOT_ATTACHED_MESSAGE, parrainCommissionStatusLabel, parrainCommissionStatusSeverity, PARRAIN_SPACE_HOME } from "~/config/clientParrain";

definePageMeta({ layout: "client", middleware: ["auth", "espace-parrain"] });
useHead({ title: "Espace parrain — Eau La Maman" });

const NB_RECENTES = 5;

const { synthese, commissions, error, notAttached, fetchSynthese, fetchCommissions } = useClientParrain();

const hasLoaded = ref(false);

onMounted(async () => {
  await Promise.all([fetchSynthese(), fetchCommissions({ per_page: NB_RECENTES })]);
  hasLoaded.value = true;
});

const totaux = computed(() => synthese.value?.totaux ?? null);
</script>

<template>
  <div>
  <section class="client-mobile-dashboard" aria-labelledby="mobile-parrain-title">
    <p v-if="notAttached" class="p-4 text-muted-color" role="status" data-testid="parrain-non-rattache">{{ NOT_ATTACHED_MESSAGE }}</p>
    <div v-else-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <p v-else-if="!hasLoaded" class="p-4 text-muted-color" role="status">Chargement de votre espace…</p>

    <template v-else-if="synthese && totaux">
      <section class="client-mobile-balance-card">
        <svg class="client-mobile-balance-wave" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 65 C105 18 174 38 260 70 C360 108 425 38 600 62 L600 180 L0 180 Z" fill="var(--p-primary-500)" />
        </svg>
        <div class="client-mobile-balance-content">
          <template v-if="totaux.total_genere > 0">
            <span id="mobile-parrain-title" class="client-mobile-balance-label">Cumul de vos commissions</span>
            <strong class="client-mobile-balance-amount">{{ formatGnf(totaux.total_genere) }}</strong>
            <div class="client-mobile-balance-meta">
              <div><span>Déjà payé</span><strong>{{ formatGnf(totaux.deja_paye) }}</strong></div>
              <div><span>Reste à payer</span><strong>{{ formatGnf(totaux.reste_a_payer) }}</strong></div>
            </div>
          </template>
          <p v-else id="mobile-parrain-title" class="client-mobile-balance-empty">Aucune commission enregistrée pour le moment.</p>
        </div>
      </section>

      <div class="client-mobile-summary-grid">
        <NuxtLink :to="`${PARRAIN_SPACE_HOME}/vehicules`" class="client-mobile-summary-card" aria-label="Voir les véhicules parrainés">
          <span class="client-mobile-summary-icon"><i class="pi pi-car" /></span>
          <div><span>Véhicules parrainés</span><strong>{{ synthese.nb_vehicules }}</strong></div>
          <i class="pi pi-chevron-right client-mobile-summary-chevron" aria-hidden="true" />
        </NuxtLink>
      </div>

      <p v-if="totaux.en_attente_periode > 0" class="client-mobile-empty-state">
        {{ formatGnf(totaux.en_attente_periode) }} en attente de validation de la période.
      </p>

      <div class="client-mobile-section-heading">
        <h2>Dernières commissions</h2>
        <NuxtLink :to="`${PARRAIN_SPACE_HOME}/commissions`">Tout voir <i class="pi pi-arrow-right" /></NuxtLink>
      </div>
      <div v-if="commissions.length" class="client-mobile-vehicle-list">
        <div v-for="commission in commissions" :key="commission.id" class="client-mobile-vehicle-row">
          <div>
            <span class="client-mobile-vehicle-name">{{ commission.vehicule?.nom_vehicule ?? commission.processus_label ?? "Opération" }}</span>
            <span class="client-mobile-vehicle-registration">{{ formatParrainDate(commission.date) }} · {{ parrainCommissionStatusLabel(commission.statut) }}</span>
          </div>
          <div class="client-mobile-vehicle-finance">
            <span class="client-mobile-vehicle-amount">{{ formatGnf(commission.montant_a_payer) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="client-mobile-empty-state">Aucune commission pour le moment.</p>
    </template>
  </section>

  <div class="client-desktop-dashboard grid grid-cols-12 gap-8">
    <div v-if="notAttached" class="col-span-12"><div class="card text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</div></div>
    <div v-else-if="error" class="col-span-12"><div class="card text-red-500" role="alert">{{ error.message }}</div></div>
    <div v-else-if="!hasLoaded" class="col-span-12"><div class="card text-muted-color" role="status">Chargement de votre espace…</div></div>

    <template v-else-if="synthese && totaux">
      <div class="col-span-12">
        <h1 class="text-3xl font-semibold mb-0">Espace parrain</h1>
        <p class="text-muted-color mt-2 mb-0">{{ synthese.parrain.nom_complet }}</p>
      </div>
      <div class="col-span-12 md:col-span-6 xl:col-span-3">
        <ClientDashboardKpiCard label="Commissions générées" :value="formatGnf(totaux.total_genere)" no-trend />
      </div>
      <div class="col-span-12 md:col-span-6 xl:col-span-3">
        <ClientDashboardKpiCard label="En attente de validation" :value="formatGnf(totaux.en_attente_periode)" no-trend />
      </div>
      <div class="col-span-12 md:col-span-6 xl:col-span-3">
        <ClientDashboardKpiCard label="Déjà payé" :value="formatGnf(totaux.deja_paye)" no-trend />
      </div>
      <div class="col-span-12 md:col-span-6 xl:col-span-3">
        <ClientDashboardKpiCard label="Reste à payer" :value="formatGnf(totaux.reste_a_payer)" no-trend />
      </div>

      <div class="col-span-12">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold text-xl">Dernières commissions</div>
            <NuxtLink :to="`${PARRAIN_SPACE_HOME}/commissions`" class="flex items-center gap-2 text-primary font-medium hover:underline">Tout voir <i class="pi pi-arrow-right text-sm" /></NuxtLink>
          </div>
          <DataTable v-if="commissions.length" :value="commissions" data-key="id" responsive-layout="scroll" striped-rows>
            <Column header="Date"><template #body="{ data }">{{ formatParrainDate(data.date) }}</template></Column>
            <Column header="Opération"><template #body="{ data }">{{ data.processus_label ?? "—" }}<span v-if="data.reference" class="block text-muted-color text-sm">{{ data.reference }}</span></template></Column>
            <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} · ${data.vehicule.immatriculation}` : "—" }}</template></Column>
            <Column header="Montant"><template #body="{ data }">{{ formatGnf(data.montant_a_payer) }}</template></Column>
            <Column header="Statut"><template #body="{ data }"><Tag :value="parrainCommissionStatusLabel(data.statut)" :severity="parrainCommissionStatusSeverity(data.statut)" /></template></Column>
          </DataTable>
          <p v-else class="text-muted-color mb-0">Aucune commission pour le moment.</p>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>
