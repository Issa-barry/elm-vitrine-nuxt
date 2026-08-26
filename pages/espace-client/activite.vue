<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

type DeliveryStatus = "En cours" | "Livrée" | "À vérifier";

interface DeliveryProduct {
  name: string;
  quantity: number;
}

interface Delivery {
  reference: string;
  vehicleName: string;
  vehicleType: string;
  vehicleRegistration: string;
  driverPhone: string;
  date: string;
  time: string;
  agency: string;
  createdBy: string;
  products: DeliveryProduct[];
  totalAmount: number;
  status: DeliveryStatus;
}

interface DeliveryFilters {
  status: "" | DeliveryStatus;
  driverPhone: string;
  vehicleName: string;
  vehicleRegistration: string;
  date: string;
  agency: string;
}

type DeliveryFilterKey = keyof DeliveryFilters;

definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Livraisons — Eau La Maman" });

// Données locales temporaires : l'interface est prête à recevoir les mêmes champs depuis l'API.
const deliveries: Delivery[] = [
  { reference: "CMD-2847", vehicleName: "ABARRY", vehicleType: "Camion", vehicleRegistration: "OU3859", driverPhone: "+224 622 60 20 10", date: "2026-08-24", time: "14:32", agency: "Agence principale", createdBy: "Mamadou Camara", products: [{ name: "Pack de 500 ml", quantity: 540 }], totalAmount: 5_400_000, status: "En cours" },
  { reference: "CMD-2841", vehicleName: "ABARRY 2", vehicleType: "Minibus", vehicleRegistration: "OU4217", driverPhone: "+224 620 45 11 28", date: "2026-08-24", time: "11:18", agency: "Agence Nord", createdBy: "Fatoumata Diallo", products: [{ name: "Pack de 1,5 L", quantity: 180 }], totalAmount: 3_600_000, status: "Livrée" },
  { reference: "CMD-2839", vehicleName: "ABARRY", vehicleType: "Camion", vehicleRegistration: "OU3859", driverPhone: "+224 622 60 20 10", date: "2026-08-23", time: "16:05", agency: "Agence principale", createdBy: "Mamadou Camara", products: [{ name: "Pack de 500 ml", quantity: 320 }], totalAmount: 3_200_000, status: "Livrée" },
  { reference: "CMD-2832", vehicleName: "ABARRY 3", vehicleType: "Tricycle", vehicleRegistration: "OU7712", driverPhone: "+224 664 32 09 17", date: "2026-08-22", time: "09:47", agency: "Agence Sud", createdBy: "Aïssatou Barry", products: [{ name: "Bidon de 20 L", quantity: 45 }], totalAmount: 2_250_000, status: "À vérifier" },
  { reference: "CMD-2826", vehicleName: "ABARRY 2", vehicleType: "Minibus", vehicleRegistration: "OU4217", driverPhone: "+224 620 45 11 28", date: "2026-08-21", time: "13:26", agency: "Agence Nord", createdBy: "Fatoumata Diallo", products: [{ name: "Pack de 500 ml", quantity: 250 }], totalAmount: 2_500_000, status: "Livrée" },
];

const createEmptyFilters = (): DeliveryFilters => ({
  status: "",
  driverPhone: "",
  vehicleName: "",
  vehicleRegistration: "",
  date: "",
  agency: "",
});

const search = ref("");
const filterPanelVisible = ref(false);
const appliedFilters = reactive<DeliveryFilters>(createEmptyFilters());
const draftFilters = reactive<DeliveryFilters>(createEmptyFilters());

const statusOptions = [
  { label: "Tous les statuts", value: "" },
  { label: "En cours", value: "En cours" },
  { label: "Livrée", value: "Livrée" },
  { label: "À vérifier", value: "À vérifier" },
];

const agencyOptions = computed(() => [
  { label: "Toutes les agences", value: "" },
  ...Array.from(new Set(deliveries.map((delivery) => delivery.agency)))
    .sort((left, right) => left.localeCompare(right, "fr"))
    .map((agency) => ({ label: agency, value: agency })),
]);

const normalizeText = (value: string) => value.trim().toLocaleLowerCase("fr");
const normalizePhone = (value: string) => value.replace(/\D/g, "");

const filterDeliveryList = (filters: DeliveryFilters, queryValue: string) => {
  const query = normalizeText(queryValue);
  const phone = normalizePhone(filters.driverPhone);
  const vehicleName = normalizeText(filters.vehicleName);
  const registration = normalizeText(filters.vehicleRegistration);

  return deliveries.filter((delivery) => {
    const matchesSearch = !query
      || normalizeText(delivery.reference).includes(query)
      || normalizeText(delivery.vehicleName).includes(query)
      || normalizeText(delivery.vehicleRegistration).includes(query);

    return matchesSearch
      && (!filters.status || delivery.status === filters.status)
      && (!phone || normalizePhone(delivery.driverPhone).includes(phone))
      && (!vehicleName || normalizeText(delivery.vehicleName).includes(vehicleName))
      && (!registration || normalizeText(delivery.vehicleRegistration).includes(registration))
      && (!filters.date || delivery.date === filters.date)
      && (!filters.agency || delivery.agency === filters.agency);
  });
};

const filteredDeliveries = computed(() => filterDeliveryList(appliedFilters, search.value));
const draftResultCount = computed(() => filterDeliveryList(draftFilters, search.value).length);

// Regroupement chronologique — parsé en UTC pour éviter tout décalage de
// fuseau horaire sur des dates stockées au format YYYY-MM-DD sans heure.
const parseUtcDate = (value: string) => new Date(`${value}T00:00:00Z`);
const utcDayNumber = (date: Date) => Math.floor(date.getTime() / 86_400_000);
const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const weekdayDateFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

const groupLabelForDate = (value: string, today: Date, todayDayNumber: number) => {
  const date = parseUtcDate(value);
  const diffDays = todayDayNumber - utcDayNumber(date);

  if (diffDays === 0) return "Aujourd’hui";
  if (diffDays === 1) return "Hier";

  const sameMonth = date.getUTCFullYear() === today.getUTCFullYear() && date.getUTCMonth() === today.getUTCMonth();
  return sameMonth ? capitalizeFirst(weekdayDateFormatter.format(date)) : capitalizeFirst(monthYearFormatter.format(date));
};

const groupedDeliveries = computed(() => {
  const today = parseUtcDate(new Date().toISOString().slice(0, 10));
  const todayDayNumber = utcDayNumber(today);

  const sorted = [...filteredDeliveries.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const groups: Array<{ label: string; items: Delivery[] }> = [];
  for (const delivery of sorted) {
    const label = groupLabelForDate(delivery.date, today, todayDayNumber);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && currentGroup.label === label) {
      currentGroup.items.push(delivery);
    } else {
      groups.push({ label, items: [delivery] });
    }
  }

  return groups;
});

const selectedDelivery = ref<Delivery | null>(null);
const detailVisible = ref(false);
const lastDeliveryTrigger = ref<HTMLElement | null>(null);

const openDeliveryDetail = (delivery: Delivery, event: MouseEvent) => {
  lastDeliveryTrigger.value = event.currentTarget as HTMLElement;
  selectedDelivery.value = delivery;
  detailVisible.value = true;
};

const resultLabel = computed(() => {
  const count = filteredDeliveries.value.length;
  return `${count} ${count > 1 ? "livraisons" : "livraison"}`;
});

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));

const numberFormatter = new Intl.NumberFormat("fr-FR");
const formatNumber = (value: number) => numberFormatter.format(value);
const formatAmount = (value: number) => `${formatNumber(value)} GNF`;

const activeFilters = computed<Array<{ key: DeliveryFilterKey; label: string; value: string }>>(() => {
  const filters: Array<{ key: DeliveryFilterKey; label: string; value: string }> = [
    { key: "status", label: "Statut", value: appliedFilters.status },
    { key: "driverPhone", label: "Téléphone", value: appliedFilters.driverPhone },
    { key: "vehicleName", label: "Véhicule", value: appliedFilters.vehicleName },
    { key: "vehicleRegistration", label: "Immatriculation", value: appliedFilters.vehicleRegistration },
    { key: "date", label: "Date", value: appliedFilters.date ? formatDate(appliedFilters.date) : "" },
    { key: "agency", label: "Agence", value: appliedFilters.agency },
  ];

  return filters.filter((filter) => Boolean(filter.value));
});

const activeFilterCount = computed(() => activeFilters.value.length);

const openFilterPanel = () => {
  Object.assign(draftFilters, appliedFilters);
  filterPanelVisible.value = true;
};

const applyFilters = () => {
  Object.assign(appliedFilters, draftFilters);
  filterPanelVisible.value = false;
};

const resetDraftFilters = () => {
  Object.assign(draftFilters, createEmptyFilters());
};

const removeFilter = (key: DeliveryFilterKey) => {
  appliedFilters[key] = "";
};

const clearAppliedFilters = () => {
  Object.assign(appliedFilters, createEmptyFilters());
  Object.assign(draftFilters, createEmptyFilters());
};

const resetAllFilters = () => {
  search.value = "";
  clearAppliedFilters();
};

const severity = (status: DeliveryStatus): "success" | "info" | "warn" => {
  if (status === "Livrée") return "success";
  if (status === "En cours") return "info";
  return "warn";
};

const statusClass = (status: DeliveryStatus) => ({
  "is-progress": status === "En cours",
  "is-delivered": status === "Livrée",
  "is-review": status === "À vérifier",
});
</script>

<template>
  <div>
  <section class="client-mobile-deliveries" aria-labelledby="mobile-deliveries-title">
    <ClientMobilePageTopbar
      title="Livraisons"
      title-id="mobile-deliveries-title"
      filter-label="Filtrer les livraisons"
      :filter-count="activeFilterCount"
      @filter="openFilterPanel"
    />
    <p class="client-mobile-page-intro">Retrouvez vos commandes et leur statut actuel.</p>

    <div class="client-mobile-deliveries__toolbar is-search-only">
      <label class="client-mobile-deliveries__search">
        <i class="pi pi-search" aria-hidden="true" />
        <span class="sr-only">Rechercher une livraison</span>
        <input
          v-model="search"
          type="search"
          inputmode="search"
          placeholder="Commande ou véhicule"
          autocomplete="off"
        >
        <button v-if="search" type="button" aria-label="Effacer la recherche" @click="search = ''">
          <i class="pi pi-times" aria-hidden="true" />
        </button>
      </label>

    </div>

    <div v-if="activeFilters.length" class="client-delivery-active-filters" aria-label="Filtres actifs">
      <button
        v-for="filter in activeFilters"
        :key="filter.key"
        type="button"
        :aria-label="`Retirer le filtre ${filter.label} : ${filter.value}`"
        @click="removeFilter(filter.key)"
      >
        <span>{{ filter.label }} : {{ filter.value }}</span>
        <i class="pi pi-times" aria-hidden="true" />
      </button>
      <button type="button" class="is-reset" @click="clearAppliedFilters">Tout effacer</button>
    </div>

    <div class="client-mobile-deliveries__list-heading">
      <h2>Commandes</h2>
      <span>{{ resultLabel }}</span>
    </div>

    <template v-if="filteredDeliveries.length">
      <template v-for="group in groupedDeliveries" :key="group.label">
        <div class="client-delivery-group-heading">
          <h3>{{ group.label }}</h3>
          <span>{{ group.items.length }}</span>
        </div>
        <div class="client-mobile-deliveries__list">
          <button
            v-for="delivery in group.items"
            :key="delivery.reference"
            type="button"
            class="client-mobile-deliveries__card"
            aria-haspopup="dialog"
            :aria-label="`Commande ${delivery.reference}, ${delivery.status}. Voir les détails.`"
            @click="openDeliveryDetail(delivery, $event)"
          >
            <span class="client-mobile-deliveries__package" aria-hidden="true">
              <i class="pi pi-box" />
            </span>
            <div class="client-mobile-deliveries__details">
              <strong>{{ delivery.reference }}</strong>
              <span><i class="pi pi-car" aria-hidden="true" /> {{ delivery.vehicleName }} {{ delivery.vehicleRegistration }}</span>
            </div>
            <span class="client-mobile-deliveries__status" :class="statusClass(delivery.status)">
              {{ delivery.status }}
            </span>
            <i class="pi pi-chevron-right client-mobile-deliveries__chevron" aria-hidden="true" />
          </button>
        </div>
      </template>
    </template>

    <div v-else class="client-mobile-deliveries__empty" role="status">
      <span aria-hidden="true"><i class="pi pi-inbox" /></span>
      <strong>Aucune livraison trouvée</strong>
      <p>Modifiez votre recherche ou vos filtres.</p>
      <button type="button" @click="resetAllFilters">Réinitialiser</button>
    </div>
  </section>

  <section class="client-desktop-deliveries" aria-labelledby="desktop-deliveries-title">
    <div class="mb-6">
      <h1 id="desktop-deliveries-title" class="text-3xl font-semibold mb-2">Livraisons</h1>
      <p class="text-muted-color m-0">Retrouvez vos commandes et leur statut actuel.</p>
    </div>

    <div class="card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 class="font-semibold text-xl m-0">Commandes</h2>
          <span class="text-muted-color text-sm">{{ resultLabel }}</span>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <IconField class="flex-1 sm:w-80">
            <InputIcon class="pi pi-search" />
            <InputText v-model="search" class="w-full" placeholder="Commande ou véhicule" />
          </IconField>
          <Button
            label="Filtres"
            icon="pi pi-sliders-h"
            severity="secondary"
            outlined
            :badge="activeFilterCount ? String(activeFilterCount) : undefined"
            @click="openFilterPanel"
          />
        </div>
      </div>

      <div v-if="activeFilters.length" class="client-delivery-active-filters mb-5" aria-label="Filtres actifs">
        <button
          v-for="filter in activeFilters"
          :key="filter.key"
          type="button"
          :aria-label="`Retirer le filtre ${filter.label} : ${filter.value}`"
          @click="removeFilter(filter.key)"
        >
          <span>{{ filter.label }} : {{ filter.value }}</span>
          <i class="pi pi-times" aria-hidden="true" />
        </button>
        <button type="button" class="is-reset" @click="clearAppliedFilters">Tout effacer</button>
      </div>

      <DataTable
        v-if="filteredDeliveries.length"
        :value="filteredDeliveries"
        data-key="reference"
        paginator
        :rows="5"
        responsive-layout="scroll"
        striped-rows
      >
        <Column field="reference" header="Commande" sortable />
        <Column header="Véhicule" sortable sort-field="vehicleName">
          <template #body="{ data }">{{ data.vehicleName }} {{ data.vehicleRegistration }}</template>
        </Column>
        <Column header="Statut">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="severity(data.status)" />
          </template>
        </Column>
      </DataTable>

      <div v-else class="flex flex-col items-center justify-center text-center py-12" role="status">
        <i class="pi pi-inbox text-muted-color !text-3xl mb-3" aria-hidden="true" />
        <strong class="text-lg">Aucune livraison trouvée</strong>
        <p class="text-muted-color mt-2 mb-4">Modifiez votre recherche ou vos filtres.</p>
        <Button label="Réinitialiser" severity="secondary" outlined @click="resetAllFilters" />
      </div>
    </div>
  </section>

  <Drawer
    v-model:visible="filterPanelVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    header="Filtrer les livraisons"
    class="client-delivery-filter-drawer"
  >
    <form id="client-delivery-filter-form" class="client-delivery-filter" @submit.prevent="applyFilters">
      <p>Affinez la liste avec un ou plusieurs critères.</p>

      <div class="client-delivery-filter__grid">
        <label class="client-delivery-filter__field">
          <span>Statut</span>
          <Select
            v-model="draftFilters.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>

        <label class="client-delivery-filter__field">
          <span>Téléphone du livreur</span>
          <InputText
            v-model="draftFilters.driverPhone"
            type="tel"
            inputmode="tel"
            placeholder="Ex. 622 60 20 10"
            fluid
          />
        </label>

        <label class="client-delivery-filter__field">
          <span>Nom du véhicule</span>
          <InputText v-model="draftFilters.vehicleName" placeholder="Ex. ABARRY" fluid />
        </label>

        <label class="client-delivery-filter__field">
          <span>Immatriculation</span>
          <InputText v-model="draftFilters.vehicleRegistration" placeholder="Ex. OU3859" fluid />
        </label>

        <label class="client-delivery-filter__field">
          <span>Date</span>
          <input v-model="draftFilters.date" type="date" class="client-delivery-filter__date">
        </label>

        <label class="client-delivery-filter__field">
          <span>Agence</span>
          <Select
            v-model="draftFilters.agency"
            :options="agencyOptions"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
      </div>

    </form>

    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="resetDraftFilters" />
        <Button
          type="submit"
          form="client-delivery-filter-form"
          :label="`Afficher ${draftResultCount} résultat${draftResultCount > 1 ? 's' : ''}`"
        />
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
    @hide="lastDeliveryTrigger?.focus()"
  >
    <template #header>
      <div class="client-delivery-detail-header">
        <span class="client-delivery-detail-handle" aria-hidden="true" />
        <button type="button" class="client-delivery-detail-close" aria-label="Fermer les détails de la commande" @click="detailVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>
    </template>

    <div v-if="selectedDelivery" class="client-delivery-detail">
      <div class="client-delivery-detail__top">
        <strong>{{ selectedDelivery.reference }}</strong>
        <span class="client-mobile-deliveries__status client-delivery-detail__status" :class="statusClass(selectedDelivery.status)">
          {{ selectedDelivery.status }}
        </span>
      </div>

      <div class="client-delivery-detail__qr">
        <QrcodeVue :value="selectedDelivery.reference" :size="176" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        <span class="client-delivery-detail__qr-hint">Scannez pour identifier la commande</span>
        <span class="client-delivery-detail__qr-ref">{{ selectedDelivery.reference }}</span>
      </div>

      <section class="client-delivery-detail__order" aria-labelledby="delivery-products-title">
        <h3 id="delivery-products-title">Produits</h3>
        <div v-for="product in selectedDelivery.products" :key="product.name" class="client-delivery-detail__product">
          <span>{{ product.name }}</span>
          <strong>× {{ formatNumber(product.quantity) }}</strong>
        </div>
        <div class="client-delivery-detail__total">
          <span>Montant total</span>
          <strong>{{ formatAmount(selectedDelivery.totalAmount) }}</strong>
        </div>
      </section>

      <div class="client-delivery-detail__rows">
        <div class="client-delivery-detail__row">
          <span>Date et heure</span>
          <strong>{{ formatDate(selectedDelivery.date) }} à {{ selectedDelivery.time }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Créée par</span>
          <strong>{{ selectedDelivery.createdBy }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Agence</span>
          <strong>{{ selectedDelivery.agency }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Véhicule</span>
          <strong>{{ selectedDelivery.vehicleName }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Type de véhicule</span>
          <strong>{{ selectedDelivery.vehicleType }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Immatriculation</span>
          <strong>{{ selectedDelivery.vehicleRegistration }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Téléphone du livreur</span>
          <strong>{{ selectedDelivery.driverPhone }}</strong>
        </div>
      </div>
    </div>
  </Drawer>
  </div>
</template>
