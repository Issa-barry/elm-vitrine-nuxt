<script setup lang="ts">
import { formatParrainDate, NOT_ATTACHED_MESSAGE, PARRAIN_SPACE_HOME } from "~/config/clientParrain";

definePageMeta({ layout: "client", middleware: ["auth", "espace-parrain"] });
useHead({ title: "Véhicules parrainés — Eau La Maman" });

const { vehicules, error, notAttached, fetchVehicules } = useClientParrain();
const hasLoaded = ref(false);

onMounted(async () => {
  await fetchVehicules();
  hasLoaded.value = true;
});

const commissionsLink = (vehiculeId: string) => ({
  path: `${PARRAIN_SPACE_HOME}/commissions`,
  query: { vehicule_id: vehiculeId },
});
</script>

<template>
  <div>
  <section class="client-mobile-expenses" aria-labelledby="mobile-parrain-vehicules-title">
    <ClientMobilePageTopbar title="Véhicules parrainés" title-id="mobile-parrain-vehicules-title" :back-to="PARRAIN_SPACE_HOME" />

    <p v-if="notAttached" class="p-4 text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</p>
    <div v-else-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>
    <p v-else-if="!hasLoaded" class="p-4 text-muted-color" role="status">Chargement des véhicules…</p>

    <div v-else-if="vehicules.length" class="client-mobile-expenses__list">
      <article v-for="vehicule in vehicules" :key="vehicule.id" class="client-mobile-expenses__card" data-testid="parrain-vehicule">
        <span class="client-mobile-expenses__icon" aria-hidden="true"><i class="pi pi-car" /></span>
        <div class="client-mobile-expenses__content">
          <div class="client-mobile-expenses__card-top"><strong>{{ vehicule.nom_vehicule }}</strong></div>
          <span>{{ vehicule.immatriculation }}<template v-if="vehicule.site_nom"> · {{ vehicule.site_nom }}</template></span>
          <small v-for="part in vehicule.parts" :key="`${part.processus_label}-${part.categorie_nom}`">
            {{ part.processus_label }} · {{ part.categorie_nom }} :
            {{ part.a_definir ? "à définir" : `${formatGnf(part.montant)} par pack` }}
          </small>
          <small v-if="!vehicule.parts.length">Part à définir par votre responsable.</small>
          <NuxtLink :to="commissionsLink(vehicule.id)" class="text-primary font-medium">Voir les commissions</NuxtLink>
        </div>
      </article>
    </div>

    <div v-else class="client-mobile-expenses__empty" role="status">
      <i class="pi pi-car" aria-hidden="true" />
      <strong>Aucun véhicule parrainé actuellement</strong>
      <span>Vos commissions passées restent consultables.</span>
    </div>
  </section>

  <section class="client-desktop-expenses" aria-labelledby="desktop-parrain-vehicules-title">
    <div class="mb-6">
      <h1 id="desktop-parrain-vehicules-title" class="text-3xl font-semibold mb-2">Véhicules parrainés</h1>
    </div>
    <div v-if="notAttached" class="card text-muted-color" role="status">{{ NOT_ATTACHED_MESSAGE }}</div>
    <div v-else-if="error" class="card text-red-500" role="alert">{{ error.message }}</div>
    <div v-else-if="!hasLoaded" class="card text-muted-color" role="status">Chargement des véhicules…</div>
    <div v-else-if="vehicules.length" class="card">
      <DataTable :value="vehicules" data-key="id" responsive-layout="scroll" striped-rows>
        <Column header="Véhicule"><template #body="{ data }"><span class="font-medium">{{ data.nom_vehicule }}</span><span class="block text-muted-color text-sm">{{ data.immatriculation }}</span></template></Column>
        <Column header="Agence"><template #body="{ data }">{{ data.site_nom ?? "—" }}</template></Column>
        <Column header="Vos parts">
          <template #body="{ data }">
            <div v-for="part in data.parts" :key="`${part.processus_label}-${part.categorie_nom}`" class="text-sm">
              {{ part.processus_label }} · {{ part.categorie_nom }} :
              <strong>{{ part.a_definir ? "à définir" : `${formatGnf(part.montant)} par pack` }}</strong>
              <span v-if="part.depuis && !part.a_definir" class="text-muted-color"> depuis le {{ formatParrainDate(part.depuis) }}</span>
            </div>
            <span v-if="!data.parts.length" class="text-muted-color text-sm">À définir par votre responsable.</span>
          </template>
        </Column>
        <Column header=""><template #body="{ data }"><NuxtLink :to="commissionsLink(data.id)" class="text-primary font-medium hover:underline">Commissions</NuxtLink></template></Column>
      </DataTable>
    </div>
    <div v-else class="card flex flex-col items-center justify-center text-center py-12" role="status">
      <i class="pi pi-car text-muted-color !text-3xl mb-3" aria-hidden="true" />
      <strong class="text-lg">Aucun véhicule parrainé actuellement</strong>
      <p class="text-muted-color mt-2 mb-0">Vos commissions passées restent consultables.</p>
    </div>
  </section>
  </div>
</template>
