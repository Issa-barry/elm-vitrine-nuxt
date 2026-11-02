<script setup lang="ts">
import QrcodeVue from "qrcode.vue";
import { vehicleTeamRoleLabel, type ClientVehicle } from "~/config/clientVehicles";

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

// Champ hérité, quasi toujours vide côté backend réel (voir
// config/clientVehicles.ts) : ne sert plus que de repli quand
// `capacites[]` est vide (véhicule sans catégorie configurée).
const formatCapacity = (capacite: number | null) =>
  capacite === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(capacite)} packs`;

// Résumés compacts pour la carte mobile / le tableau desktop (une seule
// ligne disponible) — `equipe[]`/`capacites[]` (chantier "équipe complète +
// capacités réelles" du 27/08/2026, voir config/clientVehicles.ts) restent
// la source canonique ; `conducteur`/`capacite` ne sont lus qu'en repli
// quand les nouveaux tableaux sont vides.
const vehicleDriverSummary = (vehicle: ClientVehicle) =>
  vehicle.equipe[0]?.nom_complet || vehicle.conducteur || "Non assigné";

const vehicleCapacitySummary = (vehicle: ClientVehicle) => {
  if (vehicle.capacites.length === 1) {
    const [capacite] = vehicle.capacites;
    return `${formatNumber(capacite.capacite)} ${capacite.categorie ?? ""}`.trim();
  }
  if (vehicle.capacites.length > 1) {
    return `${vehicle.capacites.length} catégories`;
  }
  return formatCapacity(vehicle.capacite);
};

const filteredVehicles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("fr");
  return vehicles.value.filter((vehicle) => {
    const matchesStatus =
      appliedStatus.value === ALL ||
      (appliedStatus.value === "active" ? vehicle.is_active : !vehicle.is_active);
    const haystack = [vehicle.nom, vehicle.immatriculation, vehicle.type, vehicleDriverSummary(vehicle)]
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

// Détail véhicule en boîte de dialogue (bas d'écran), plus une navigation
// vers /espace-client/vehicules/[id] (demande du 27/08/2026) — même patron
// que le détail d'opération de pages/espace-client/activite.vue. Cette page
// [id] existait déjà mais n'était jamais branchée sur de vraies données
// (chantier resté ouvert) ; elle n'est plus liée nulle part depuis cette
// page désormais, laissée en place telle quelle (pas supprimée, non demandé).
//
// MàJ 27/08/2026 : le backend expose désormais l'équipe complète
// (`equipe[]`, nom + téléphone + rôle réel chauffeur/convoyeur, jamais
// traduit côté backend) et la capacité réelle par catégorie (`capacites[]`)
// — voir config/clientVehicles.ts pour le détail vérifié directement contre
// App\Http\Controllers\Api\Client\VehiculesController (elm-monolithe) et ses
// 11 tests. `conducteur`/`capacite` (un seul nom/nombre) restent dans le
// contrat pour compatibilité descendante mais ne sont plus lus ici QUE
// lorsque `equipe`/`capacites` sont vides (véhicule sans équipe/catégorie
// configurée) — jamais pour l'affichage principal.
const selectedVehicle = ref<ClientVehicle | null>(null);
const detailVisible = ref(false);
const lastVehicleTrigger = ref<HTMLElement | null>(null);

const openVehicleDetail = (vehicle: ClientVehicle, event: MouseEvent) => {
  lastVehicleTrigger.value = event.currentTarget as HTMLElement;
  selectedVehicle.value = vehicle;
  detailVisible.value = true;
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
        <button
          v-for="vehicle in filteredVehicles"
          :key="vehicle.id"
          type="button"
          class="client-mobile-vehicles-card"
          aria-haspopup="dialog"
          :aria-label="`Voir les détails de ${vehicle.nom}`"
          @click="openVehicleDetail(vehicle, $event)"
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
            <span><i class="pi pi-box" aria-hidden="true" /> {{ vehicleCapacitySummary(vehicle) }}</span>
            <span><i class="pi pi-user" aria-hidden="true" /> {{ vehicleDriverSummary(vehicle) }}</span>
            <span v-if="vehicle.en_livraison"><i class="pi pi-send" aria-hidden="true" /> En livraison</span>
          </div>
        </button>
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
        <Column field="nom" header="Véhicule" sortable><template #body="{ data }"><button type="button" class="font-medium text-primary hover:underline" @click="openVehicleDetail(data, $event)">{{ data.nom }}</button></template></Column>
        <Column field="immatriculation" header="Immatriculation" sortable />
        <Column field="type" header="Type" sortable />
        <Column header="Capacité"><template #body="{ data }">{{ vehicleCapacitySummary(data) }}</template></Column>
        <Column header="Conducteur"><template #body="{ data }">{{ vehicleDriverSummary(data) }}</template></Column>
        <Column header="Statut"><template #body="{ data }"><Tag :value="data.is_active ? 'Actif' : 'Inactif'" :severity="data.is_active ? 'success' : 'warn'" /></template></Column>
        <Column header="Actions"><template #body="{ data }"><Button icon="pi pi-eye" text rounded severity="secondary" :aria-label="`Voir ${data.nom}`" @click="openVehicleDetail(data, $event)" /></template></Column>
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

  <Drawer
    v-model:visible="detailVisible"
    position="bottom"
    modal
    dismissable
    close-on-escape
    block-scroll
    :show-close-icon="false"
    class="client-delivery-detail-drawer"
    @hide="lastVehicleTrigger?.focus()"
  >
    <template #header>
      <div class="client-delivery-detail-header">
        <span class="client-delivery-detail-handle" aria-hidden="true" />
        <button type="button" class="client-delivery-detail-close" aria-label="Fermer les détails du véhicule" @click="detailVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>
    </template>

    <div v-if="selectedVehicle" class="client-delivery-detail">
      <div class="client-delivery-detail__top">
        <strong>{{ selectedVehicle.nom }}</strong>
        <Tag :value="selectedVehicle.is_active ? 'Actif' : 'Inactif'" :severity="selectedVehicle.is_active ? 'success' : 'warn'" />
      </div>

      <!-- QR = immatriculation réelle, déjà affichée juste en dessous —
        jamais un identifiant fabriqué. Même composant/pattern que
        pages/espace-client/activite.vue (QR sur la référence de commande). -->
      <div class="client-delivery-detail__qr">
        <QrcodeVue :value="selectedVehicle.immatriculation" :size="176" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        <span class="client-delivery-detail__qr-hint">Scannez pour identifier le véhicule</span>
        <span class="client-delivery-detail__qr-ref">{{ selectedVehicle.immatriculation }}</span>
      </div>

      <div class="client-delivery-detail__rows">
        <div class="client-delivery-detail__row">
          <span>Immatriculation</span>
          <strong>{{ selectedVehicle.immatriculation }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Type</span>
          <strong>{{ selectedVehicle.type }}</strong>
        </div>
        <div v-if="selectedVehicle.en_livraison" class="client-delivery-detail__row">
          <span>Livraison en cours</span>
          <strong>Oui</strong>
        </div>
        <!-- Replis (véhicule sans équipe/catégorie configurée) : affichés
          UNIQUEMENT quand les sources canoniques ci-dessous sont vides. -->
        <div v-if="!selectedVehicle.capacites.length" class="client-delivery-detail__row">
          <span>Capacité</span>
          <strong>{{ formatCapacity(selectedVehicle.capacite) }}</strong>
        </div>
        <div v-if="!selectedVehicle.equipe.length" class="client-delivery-detail__row">
          <span>Conducteur</span>
          <strong>{{ selectedVehicle.conducteur || "Non assigné" }}</strong>
        </div>
      </div>

      <div v-if="selectedVehicle.proprietaire" class="client-delivery-detail__order">
        <h3>Propriétaire</h3>
        <div class="client-delivery-detail__row">
          <span>Nom</span>
          <strong>{{ selectedVehicle.proprietaire.nom_complet }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Téléphone</span>
          <strong>{{ selectedVehicle.proprietaire.telephone || "—" }}</strong>
        </div>
      </div>

      <!-- Équipe complète (tous les membres, jamais un seul nom) : source
        canonique `equipe[]` — voir config/clientVehicles.ts et le
        commentaire au-dessus de selectedVehicle. -->
      <div v-if="selectedVehicle.equipe.length" class="client-delivery-detail__order">
        <h3>Équipe de livraison</h3>
        <div
          v-for="(membre, index) in selectedVehicle.equipe"
          :key="membre.id"
          class="flex items-center justify-between gap-3"
          :class="index > 0 ? 'mt-3 pt-3 border-t border-surface' : ''"
        >
          <div class="min-w-0">
            <strong class="block text-surface-900 dark:text-surface-0 text-sm font-semibold truncate">{{ membre.nom_complet || "—" }}</strong>
            <span class="block text-muted-color text-xs mt-0.5">{{ membre.telephone || "—" }}</span>
          </div>
          <Tag :value="vehicleTeamRoleLabel(membre.role)" severity="secondary" />
        </div>
      </div>

      <div v-if="selectedVehicle.capacites.length" class="client-delivery-detail__order">
        <h3>Capacités</h3>
        <div v-for="capacite in selectedVehicle.capacites" :key="capacite.categorie_id" class="client-delivery-detail__row">
          <span>{{ capacite.categorie || "—" }}</span>
          <strong>{{ formatNumber(capacite.capacite) }}</strong>
        </div>
      </div>
    </div>
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
