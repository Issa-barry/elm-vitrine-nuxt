<script setup lang="ts">
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Mes véhicules — Eau La Maman" });

// GET /v1/mobile/vehicules/mine via le BFF (server/api/client/vehicles.get.ts)
// — pas de pagination côté backend (collection complète, voir
// config/clientVehicles.ts), pas de statut "Entretien" dans le modèle ELM :
// seul `is_active` existe (voir demande du 26/08/2026, section 15).
const { vehicles, isLoading, error, hasLoaded, fetchVehicles } = useClientVehicles();

onMounted(() => {
  fetchVehicles();
});

// "tous" plutôt que "" comme valeur par défaut : PrimeVue Select affiche son
// placeholder (jamais défini ici) tant que la modelValue est vide ("", null,
// undefined), même avec une option `{ value: "" }` déjà présente dans la
// liste — d'où ce sentinel non vide (voir même correctif sur depenses.vue,
// commissions.vue, activite.vue).
const ALL = "tous";
const search = ref("");
const vehicleFilterVisible = ref(false);
const appliedStatus = ref<typeof ALL | "active" | "inactive">(ALL);
const draftStatus = ref<typeof ALL | "active" | "inactive">(ALL);

const formatCapacity = (capacite: number | null) =>
  capacite === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(capacite)} packs`;

const filteredVehicles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("fr");
  return vehicles.value.filter((vehicle) => {
    const matchesStatus =
      appliedStatus.value === ALL ||
      (appliedStatus.value === "active" ? vehicle.is_active : !vehicle.is_active);
    const haystack = [vehicle.nom, vehicle.immatriculation, vehicle.type, vehicle.conducteur]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr");
    const matchesSearch = !query || haystack.includes(query);
    return matchesStatus && matchesSearch;
  });
});

const vehicleStatusOptions = [
  { label: "Tous les statuts", value: ALL },
  { label: "Actif", value: "active" },
  { label: "Inactif", value: "inactive" },
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
      :filter-count="appliedStatus !== ALL ? 1 : 0"
      @filter="openVehicleFilter"
    />

    <p v-if="isLoading && !hasLoaded" class="client-mobile-vehicles-status" role="status">Chargement…</p>

    <p v-else-if="error" class="client-mobile-vehicles-status client-mobile-vehicles-status--error" role="alert">{{ error.message }}</p>

    <template v-else>
      <div class="client-mobile-vehicles-page__intro">
        <p>Suivez l’activité de chaque véhicule.</p>
        <span>{{ filteredVehicles.length }}</span>
      </div>

      <label class="client-mobile-vehicles-search">
        <i class="pi pi-search" aria-hidden="true" />
        <span class="sr-only">Rechercher un véhicule</span>
        <input v-model="search" type="search" inputmode="search" placeholder="Nom, type, immatriculation ou conducteur" autocomplete="off">
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
          :aria-label="`Voir les détails de ${vehicle.nom}`"
        >
          <div class="client-mobile-vehicles-card__top">
            <span class="client-mobile-vehicles-card__icon" aria-hidden="true"><i class="pi pi-car" /></span>
            <div class="client-mobile-vehicles-card__identity">
              <strong>{{ vehicle.nom }}</strong>
              <span>{{ vehicle.type }} · {{ vehicle.immatriculation }}</span>
            </div>
            <span class="client-mobile-vehicles-card__status" :class="{ 'is-maintenance': !vehicle.is_active }">
              {{ vehicle.is_active ? "Actif" : "Inactif" }}
            </span>
          </div>

          <div class="client-mobile-vehicles-card__meta">
            <span><i class="pi pi-box" aria-hidden="true" /> {{ formatCapacity(vehicle.capacite) }}</span>
            <span><i class="pi pi-user" aria-hidden="true" /> {{ vehicle.conducteur || "Non assigné" }}</span>
            <span v-if="vehicle.en_livraison"><i class="pi pi-send" aria-hidden="true" /> En livraison</span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="!filteredVehicles.length && hasLoaded" class="client-mobile-vehicles-empty" role="status">
        <span aria-hidden="true"><i class="pi pi-car" /></span>
        <strong>{{ vehicles.length ? "Aucun véhicule trouvé" : "Aucun véhicule rattaché à votre compte" }}</strong>
        <p v-if="vehicles.length">Essayez avec un autre nom ou une autre immatriculation.</p>
        <button v-if="search || appliedStatus !== ALL" type="button" @click="search = ''; appliedStatus = ALL">Réinitialiser les filtres</button>
      </div>
    </template>
  </section>

  <div class="card client-desktop-vehicles">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div><div class="font-semibold text-xl">Mes véhicules</div><span class="text-muted-color">Véhicules rattachés à votre compte</span></div>
    </div>

    <p v-if="isLoading && !hasLoaded" class="text-muted-color">Chargement…</p>
    <p v-else-if="error" class="text-red-600">{{ error.message }}</p>
    <template v-else>
      <div class="flex justify-end mb-4">
        <IconField><InputIcon class="pi pi-search" /><InputText v-model="search" placeholder="Rechercher" /></IconField>
      </div>
      <DataTable :value="filteredVehicles" data-key="id" :rows="10" :paginator="filteredVehicles.length > 10" responsive-layout="scroll" striped-rows>
        <template #empty>{{ vehicles.length ? "Aucun véhicule trouvé." : "Aucun véhicule rattaché à votre compte." }}</template>
        <Column field="nom" header="Véhicule" sortable><template #body="{ data }"><NuxtLink :to="`/espace-client/vehicules/${data.id}`" external class="font-medium text-primary hover:underline">{{ data.nom }}</NuxtLink></template></Column>
        <Column field="immatriculation" header="Immatriculation" sortable />
        <Column field="type" header="Type" sortable />
        <Column header="Capacité"><template #body="{ data }">{{ formatCapacity(data.capacite) }}</template></Column>
        <Column header="Conducteur"><template #body="{ data }">{{ data.conducteur || "Non assigné" }}</template></Column>
        <Column header="Statut"><template #body="{ data }"><Tag :value="data.is_active ? 'Actif' : 'Inactif'" :severity="data.is_active ? 'success' : 'warn'" /></template></Column>
        <Column header="Actions"><template #body="{ data }"><NuxtLink :to="`/espace-client/vehicules/${data.id}`" external :aria-label="`Voir ${data.nom}`"><Button icon="pi pi-eye" text rounded severity="secondary" /></NuxtLink></template></Column>
      </DataTable>
    </template>
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
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="draftStatus = ALL" />
        <Button type="submit" form="client-vehicle-filter-form" label="Afficher les véhicules" />
      </div>
    </template>
  </Drawer>
  </div>
</template>

<style lang="scss" scoped>
.client-mobile-vehicles-status {
  padding: 1rem;
  color: var(--p-text-muted-color);
  text-align: center;
}

.client-mobile-vehicles-status--error {
  color: var(--p-red-600, #dc2626);
}
</style>
