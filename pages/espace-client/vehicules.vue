<script setup lang="ts">
definePageMeta({ layout: "client" });
useHead({ title: "Mes véhicules — Eau La Maman" });

const search = ref("");
const vehicleFilterVisible = ref(false);
const appliedStatus = ref("");
const draftStatus = ref("");
const vehicles = [
  { id: "ou3859", name: "ABARRY", plate: "OU3859", type: "Camion", capacityPacks: 500, driver: "Issa M.", status: "Actif", gains: "2 380 000 GNF" },
  { id: "ou4217", name: "ABARRY 2", plate: "OU4217", type: "Minibus", capacityPacks: 150, driver: "Mamadou D.", status: "Actif", gains: "1 950 000 GNF" },
  { id: "ou7712", name: "ABARRY 3", plate: "OU7712", type: "Tricycle", capacityPacks: 80, driver: "Amine B.", status: "Entretien", gains: "1 420 000 GNF" },
];

const formatCapacity = (capacityPacks: number) => `${new Intl.NumberFormat("fr-FR").format(capacityPacks)} packs`;

const filteredVehicles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("fr");
  return vehicles.filter((vehicle) => {
    const matchesStatus = !appliedStatus.value || vehicle.status === appliedStatus.value;
    const matchesSearch = !query || Object.values(vehicle).some((value) => String(value).toLocaleLowerCase("fr").includes(query));
    return matchesStatus && matchesSearch;
  });
});

const vehicleStatusOptions = [
  { label: "Tous les statuts", value: "" },
  { label: "Actif", value: "Actif" },
  { label: "Entretien", value: "Entretien" },
];

const openVehicleFilter = () => {
  draftStatus.value = appliedStatus.value;
  vehicleFilterVisible.value = true;
};

const applyVehicleFilter = () => {
  appliedStatus.value = draftStatus.value;
  vehicleFilterVisible.value = false;
};
</script>

<template>
  <div>
  <section class="client-mobile-vehicles-page" aria-labelledby="mobile-vehicles-title">
    <ClientMobilePageTopbar
      title="Véhicules"
      title-id="mobile-vehicles-title"
      filter-label="Filtrer les véhicules"
      :filter-count="appliedStatus ? 1 : 0"
      @filter="openVehicleFilter"
    />
    <div class="client-mobile-vehicles-page__intro">
      <p>Suivez les gains et l’activité de chaque véhicule.</p>
      <span>{{ filteredVehicles.length }}</span>
    </div>

    <label class="client-mobile-vehicles-search">
      <i class="pi pi-search" aria-hidden="true" />
      <span class="sr-only">Rechercher un véhicule</span>
      <input v-model="search" type="search" inputmode="search" placeholder="Nom, type ou immatriculation" autocomplete="off">
      <button v-if="search" type="button" aria-label="Effacer la recherche" @click="search = ''">
        <i class="pi pi-times" aria-hidden="true" />
      </button>
    </label>

    <div class="client-mobile-vehicles-list" :aria-label="`${filteredVehicles.length} véhicule${filteredVehicles.length > 1 ? 's' : ''}`">
      <NuxtLink
        v-for="vehicle in filteredVehicles"
        :key="vehicle.id"
        :to="`/espace-client/vehicules/${vehicle.id}`"
        external
        class="client-mobile-vehicles-card"
        :aria-label="`Voir les détails de ${vehicle.name}`"
      >
        <div class="client-mobile-vehicles-card__top">
          <span class="client-mobile-vehicles-card__icon" aria-hidden="true"><i class="pi pi-car" /></span>
          <div class="client-mobile-vehicles-card__identity">
            <strong>{{ vehicle.name }}</strong>
            <span>{{ vehicle.type }} · {{ vehicle.plate }}</span>
          </div>
          <span class="client-mobile-vehicles-card__status" :class="{ 'is-maintenance': vehicle.status !== 'Actif' }">
            {{ vehicle.status }}
          </span>
        </div>

        <div class="client-mobile-vehicles-card__meta">
          <span><i class="pi pi-box" aria-hidden="true" /> {{ formatCapacity(vehicle.capacityPacks) }}</span>
          <span><i class="pi pi-user" aria-hidden="true" /> {{ vehicle.driver }}</span>
        </div>

        <div class="client-mobile-vehicles-card__finance">
          <div>
            <span>Commissions générées</span>
            <strong>{{ vehicle.gains }}</strong>
          </div>
          <i class="pi pi-chevron-right" aria-hidden="true" />
        </div>
      </NuxtLink>
    </div>

    <div v-if="!filteredVehicles.length" class="client-mobile-vehicles-empty" role="status">
      <span aria-hidden="true"><i class="pi pi-car" /></span>
      <strong>Aucun véhicule trouvé</strong>
      <p>Essayez avec un autre nom ou une autre immatriculation.</p>
      <button type="button" @click="search = ''">Effacer la recherche</button>
    </div>
  </section>

  <div class="card client-desktop-vehicles">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div><div class="font-semibold text-xl">Mes véhicules</div><span class="text-muted-color">Véhicules rattachés à votre compte propriétaire</span></div>
    </div>
    <div class="flex justify-end mb-4">
      <IconField><InputIcon class="pi pi-search" /><InputText v-model="search" placeholder="Rechercher" /></IconField>
    </div>
    <DataTable :value="filteredVehicles" data-key="plate" :rows="10" paginator responsive-layout="scroll" striped-rows>
      <Column field="name" header="Véhicule" sortable><template #body="{ data }"><NuxtLink :to="`/espace-client/vehicules/${data.id}`" external class="font-medium text-primary hover:underline">{{ data.name }}</NuxtLink></template></Column>
      <Column field="plate" header="Immatriculation" sortable />
      <Column field="type" header="Type" sortable />
      <Column header="Capacité"><template #body="{ data }">{{ formatCapacity(data.capacityPacks) }}</template></Column>
      <Column field="driver" header="Conducteur" />
      <Column header="Statut"><template #body="{ data }"><Tag :value="data.status" :severity="data.status === 'Actif' ? 'success' : 'warn'" /></template></Column>
      <Column header="Actions"><template #body="{ data }"><NuxtLink :to="`/espace-client/vehicules/${data.id}`" external :aria-label="`Voir ${data.name}`"><Button icon="pi pi-eye" text rounded severity="secondary" /></NuxtLink></template></Column>
    </DataTable>
  </div>

  <Drawer
    v-model:visible="vehicleFilterVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    header="Filtrer les véhicules"
    class="client-delivery-filter-drawer"
  >
    <form id="client-vehicle-filter-form" class="client-delivery-filter" @submit.prevent="applyVehicleFilter">
      <p>Affichez les véhicules selon leur statut actuel.</p>
      <label class="client-delivery-filter__field">
        <span>Statut</span>
        <Select v-model="draftStatus" :options="vehicleStatusOptions" option-label="label" option-value="value" fluid />
      </label>
    </form>

    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="draftStatus = ''" />
        <Button type="submit" form="client-vehicle-filter-form" label="Afficher les véhicules" />
      </div>
    </template>
  </Drawer>
  </div>
</template>
