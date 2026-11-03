<script setup lang="ts">
import { formatParrainDate, NOT_ATTACHED_MESSAGE, PARRAIN_SPACE_HOME } from "~/config/clientParrain";

definePageMeta({ layout: "client", middleware: ["auth", "espace-parrain"] });
useHead({ title: "Mes paiements — Eau La Maman" });

const { paiements, paiementsMeta, isLoading, error, notAttached, fetchPaiements } = useClientParrain();
const hasLoaded = ref(false);

onMounted(async () => {
  await fetchPaiements();
  hasLoaded.value = true;
});

const hasMore = computed(() => {
  const meta = paiementsMeta.value;
  return Boolean(meta && meta.current_page < meta.last_page);
});

function loadMore() {
  return fetchPaiements({ page: (paiementsMeta.value?.current_page ?? 1) + 1 }, true);
}
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-parrain-paiements-title">
    <ClientMobilePageTopbar title="Mes paiements" title-id="mobile-parrain-paiements-title" :back-to="PARRAIN_SPACE_HOME" />

    <p v-if="notAttached" class="p-4 text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</p>
    <div v-else-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <p v-else-if="!hasLoaded" class="p-4 text-muted-color" role="status">Chargement des paiements…</p>

    <div v-else-if="paiements.length" class="client-mobile-expenses__list">
      <article v-for="paiement in paiements" :key="paiement.id" class="client-mobile-expenses__card" data-testid="parrain-paiement">
        <span class="client-mobile-expenses__icon" aria-hidden="true"><i class="pi pi-wallet" /></span>
        <div class="client-mobile-expenses__content">
          <div class="client-mobile-expenses__card-top"><strong>{{ paiement.mode_paiement_label }}</strong></div>
          <span>{{ formatParrainDate(paiement.date) }}</span>
          <small v-if="paiement.reference_paiement">Référence : {{ paiement.reference_paiement }}</small>
          <small>{{ paiement.fiche_reference }}</small>
        </div>
        <strong class="client-mobile-expenses__amount">{{ formatGnf(paiement.montant) }}</strong>
      </article>
      <Button v-if="hasMore" label="Afficher plus" severity="secondary" outlined fluid :loading="isLoading" @click="loadMore" />
    </div>

    <div v-else class="client-mobile-expenses__empty" role="status">
      <i class="pi pi-wallet" aria-hidden="true" />
      <strong>Aucun paiement pour le moment</strong>
      <span>Vos versements apparaîtront ici dès qu'ils seront enregistrés.</span>
    </div>
  </section>

  <section class="client-desktop-expenses" aria-labelledby="desktop-parrain-paiements-title">
    <div class="mb-6">
      <h1 id="desktop-parrain-paiements-title" class="text-3xl font-semibold mb-2">Mes paiements</h1>
    </div>
    <div v-if="notAttached" class="card text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</div>
    <div v-else-if="error" class="card text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="!hasLoaded" class="card text-muted-color" role="status">Chargement des paiements…</div>
    <div v-else-if="paiements.length" class="card">
      <DataTable :value="paiements" data-key="id" responsive-layout="scroll" striped-rows>
        <Column header="Date"><template #body="{ data }">{{ formatParrainDate(data.date) }}</template></Column>
        <Column header="Montant"><template #body="{ data }"><strong>{{ formatGnf(data.montant) }}</strong></template></Column>
        <Column header="Mode"><template #body="{ data }">{{ data.mode_paiement_label }}</template></Column>
        <Column header="Référence"><template #body="{ data }">{{ data.reference_paiement ?? "—" }}</template></Column>
        <Column header="Fiche"><template #body="{ data }">{{ data.fiche_reference ?? "—" }}<span v-if="data.periode_reference" class="block text-muted-color text-sm">{{ data.periode_reference }}</span></template></Column>
      </DataTable>
      <div v-if="hasMore" class="flex justify-center mt-4">
        <Button label="Afficher plus" severity="secondary" outlined :loading="isLoading" @click="loadMore" />
      </div>
    </div>
    <div v-else class="card flex flex-col items-center justify-center text-center py-12" role="status">
      <i class="pi pi-wallet text-muted-color !text-3xl mb-3" aria-hidden="true" />
      <strong class="text-lg">Aucun paiement pour le moment</strong>
      <p class="text-muted-color mt-2 mb-0">Vos versements apparaîtront ici dès qu'ils seront enregistrés.</p>
    </div>
  </section>
  </div>
</template>
